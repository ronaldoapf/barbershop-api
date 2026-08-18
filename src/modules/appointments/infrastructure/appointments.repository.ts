import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Appointment,
  AppointmentService,
  LoyaltyTransactionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { PaginationHelper } from '../../../shared/application/pagination.helper';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentServiceEntity } from '../domain/appointment-service.entity';
import { AppointmentSource } from '../domain/appointment-source.enum';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import {
  CancelAppointmentData,
  CompleteAppointmentItemInput,
  CreateAppointmentData,
  IAppointmentsRepository,
  ListAppointmentsFilter,
} from '../domain/appointments.repository.interface';

type AppointmentWithServices = Appointment & {
  appointmentServices: AppointmentService[];
};

const includeServices = {
  appointmentServices: true,
} satisfies Prisma.AppointmentInclude;

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

@Injectable()
export class AppointmentsRepository implements IAppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithConflictCheck(
    data: CreateAppointmentData,
  ): Promise<AppointmentEntity> {
    try {
      const record = await this.prisma.$transaction(
        async (tx) => {
          const conflict = await tx.appointment.findFirst({
            where: {
              barberId: data.barberId,
              disabledAt: null,
              status: { in: ACTIVE_STATUSES },
              startsAt: { lt: data.endsAt },
              endsAt: { gt: data.startsAt },
            },
          });
          if (conflict) {
            throw new ConflictException(
              'Este horário já está ocupado para este barbeiro.',
            );
          }

          return tx.appointment.create({
            data: {
              customerId: data.customerId,
              barberId: data.barberId,
              startsAt: data.startsAt,
              endsAt: data.endsAt,
              totalAmount: data.totalAmount,
              source: data.source,
              appointmentServices: {
                create: data.services.map((service) => ({
                  serviceId: service.serviceId,
                  serviceName: service.serviceName,
                  price: service.price,
                  durationMinutes: service.durationMinutes,
                  pointsEarned: service.pointsEarned,
                })),
              },
            },
            include: includeServices,
          });
        },
        // READ COMMITTED (Postgres' default) would let two concurrent
        // transactions both pass the findFirst check before either commits
        // its insert — the double-booking this method exists to prevent.
        // SERIALIZABLE makes Postgres detect that read/write conflict and
        // abort the loser with a P2034 error, caught below.
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return this.toEntity(record);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2034'
      ) {
        throw new ConflictException(
          'Este horário já está ocupado para este barbeiro.',
        );
      }
      throw e;
    }
  }

  async findById(id: string): Promise<AppointmentEntity | null> {
    const record = await this.prisma.appointment.findFirst({
      where: { id, disabledAt: null },
      include: includeServices,
    });
    return record ? this.toEntity(record) : null;
  }

  async list(
    filter: ListAppointmentsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AppointmentEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(page, limit);
    const where: Prisma.AppointmentWhereInput = {
      disabledAt: null,
      ...(filter.customerId && { customerId: filter.customerId }),
      ...(filter.barberId && { barberId: filter.barberId }),
      ...(filter.status && { status: filter.status }),
    };

    const [records, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: includeServices,
        skip,
        take,
        orderBy: { startsAt: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: records.map((record) => this.toEntity(record)),
      total,
      page,
      limit,
    };
  }

  async listActiveInRange(
    barberId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AppointmentEntity[]> {
    const records = await this.prisma.appointment.findMany({
      where: {
        barberId,
        disabledAt: null,
        status: { in: ACTIVE_STATUSES },
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
      },
      include: includeServices,
      orderBy: { startsAt: 'asc' },
    });
    return records.map((record) => this.toEntity(record));
  }

  async confirm(id: string): Promise<AppointmentEntity> {
    const record = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
      include: includeServices,
    });
    return this.toEntity(record);
  }

  async markNoShow(id: string): Promise<AppointmentEntity> {
    const record = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.NO_SHOW },
      include: includeServices,
    });
    return this.toEntity(record);
  }

  async cancel(
    id: string,
    data: CancelAppointmentData,
  ): Promise<AppointmentEntity> {
    const record = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: data.cancellationReason,
        cancelledBy: data.cancelledBy,
        cancelledAt: new Date(),
      },
      include: includeServices,
    });
    return this.toEntity(record);
  }

  async complete(
    id: string,
    items: CompleteAppointmentItemInput[],
    commissionOnRedeemedService: boolean,
  ): Promise<AppointmentEntity> {
    const record = await this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id },
        include: includeServices,
      });
      if (!appointment) {
        throw new NotFoundException('Agendamento não encontrado.');
      }

      const barber = await tx.barber.findUniqueOrThrow({
        where: { id: appointment.barberId },
      });
      const commissionPercentage = barber.commissionPercentage;

      const customer = await tx.user.findUniqueOrThrow({
        where: { id: appointment.customerId },
      });

      const overrides = new Map(
        items.map((item) => [item.appointmentServiceId, item]),
      );

      let netPointsChange = 0;

      for (const item of appointment.appointmentServices) {
        const redeemedWithPoints =
          overrides.get(item.id)?.redeemedWithPoints ?? false;

        const commissionAmount =
          redeemedWithPoints && !commissionOnRedeemedService
            ? 0
            : Math.round((item.price * commissionPercentage.toNumber()) / 100);

        await tx.appointmentService.update({
          where: { id: item.id },
          data: {
            redeemedWithPoints,
            commissionPercentageApplied: commissionPercentage,
            commissionAmount,
          },
        });

        if (redeemedWithPoints) {
          const service = await tx.service.findUniqueOrThrow({
            where: { id: item.serviceId },
          });
          const pointsToRedeem = service.pointsRequired;
          if (pointsToRedeem > 0) {
            if (customer.loyaltyPoints + netPointsChange < pointsToRedeem) {
              throw new BadRequestException(
                `Cliente não possui pontos suficientes para resgatar "${item.serviceName}".`,
              );
            }
            netPointsChange -= pointsToRedeem;
            await tx.loyaltyTransaction.create({
              data: {
                customerId: appointment.customerId,
                appointmentId: appointment.id,
                type: LoyaltyTransactionType.REDEEM,
                points: pointsToRedeem,
                description: `Resgate: ${item.serviceName}`,
              },
            });
          }
        } else if (item.pointsEarned > 0) {
          netPointsChange += item.pointsEarned;
          await tx.loyaltyTransaction.create({
            data: {
              customerId: appointment.customerId,
              appointmentId: appointment.id,
              type: LoyaltyTransactionType.EARN,
              points: item.pointsEarned,
              description: `Ganho: ${item.serviceName}`,
            },
          });
        }
      }

      if (netPointsChange !== 0) {
        await tx.user.update({
          where: { id: appointment.customerId },
          data: { loyaltyPoints: { increment: netPointsChange } },
        });
      }

      return tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.COMPLETED },
        include: includeServices,
      });
    });

    return this.toEntity(record);
  }

  private toEntity(record: AppointmentWithServices): AppointmentEntity {
    return {
      id: record.id,
      customerId: record.customerId,
      barberId: record.barberId,
      startsAt: record.startsAt,
      endsAt: record.endsAt as Date,
      totalAmount: record.totalAmount,
      status: record.status as AppointmentStatus,
      source: record.source as AppointmentSource,
      cancellationReason: record.cancellationReason,
      cancelledBy: record.cancelledBy,
      cancelledAt: record.cancelledAt,
      createdAt: record.createdAt,
      disabledAt: record.disabledAt,
      services: record.appointmentServices.map((service) =>
        this.toServiceEntity(service),
      ),
    };
  }

  private toServiceEntity(
    record: AppointmentService,
  ): AppointmentServiceEntity {
    return {
      id: record.id,
      appointmentId: record.appointmentId,
      serviceId: record.serviceId,
      serviceName: record.serviceName,
      price: record.price,
      durationMinutes: record.durationMinutes,
      pointsEarned: record.pointsEarned,
      redeemedWithPoints: record.redeemedWithPoints,
      commissionPercentageApplied:
        record.commissionPercentageApplied?.toNumber() ?? null,
      commissionAmount: record.commissionAmount,
      createdAt: record.createdAt,
    };
  }
}
