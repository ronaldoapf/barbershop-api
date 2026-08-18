import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IBarberServicesRepository } from '../../barber-services/domain/barber-services.repository.interface';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { ItemStatus } from '../../services/domain/item-status.enum';
import { IServicesRepository } from '../../services/domain/services.repository.interface';
import { GetAvailabilityWindowUseCase } from '../../working-hours/application/get-availability-window.use-case';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentSource } from '../domain/appointment-source.enum';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { combineDateAndTime } from '../domain/slot-calculator.util';

export interface CreateAppointmentInput {
  barberId: string;
  serviceIds: string[];
  startsAt: Date;
}

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly barbersRepository: IBarbersRepository,
    private readonly servicesRepository: IServicesRepository,
    private readonly barberServicesRepository: IBarberServicesRepository,
    private readonly getAvailabilityWindowUseCase: GetAvailabilityWindowUseCase,
  ) {}

  async execute(
    customerId: string,
    input: CreateAppointmentInput,
  ): Promise<AppointmentEntity> {
    const barber = await this.barbersRepository.findById(input.barberId);
    if (!barber) {
      throw new NotFoundException('Barbeiro não encontrado.');
    }

    const offeredServiceIds =
      await this.barberServicesRepository.listServiceIdsByBarber(
        input.barberId,
      );
    const notOffered = input.serviceIds.filter(
      (id) => !offeredServiceIds.includes(id),
    );
    if (notOffered.length > 0) {
      throw new BadRequestException(
        'Este barbeiro não realiza um ou mais dos serviços solicitados.',
      );
    }

    const services = await Promise.all(
      input.serviceIds.map((id) => this.servicesRepository.findById(id)),
    );
    if (services.some((service) => !service)) {
      throw new NotFoundException('Um ou mais serviços não foram encontrados.');
    }
    const resolvedServices = services as NonNullable<(typeof services)[0]>[];
    if (
      resolvedServices.some((service) => service.status !== ItemStatus.ACTIVE)
    ) {
      throw new BadRequestException(
        'Um ou mais serviços não estão mais disponíveis.',
      );
    }

    const totalDurationMinutes = resolvedServices.reduce(
      (sum, service) => sum + service.durationMinutes,
      0,
    );
    const totalAmount = resolvedServices.reduce(
      (sum, service) => sum + service.price,
      0,
    );
    const endsAt = new Date(
      input.startsAt.getTime() + totalDurationMinutes * 60_000,
    );

    const window = await this.getAvailabilityWindowUseCase.execute(
      input.barberId,
      input.startsAt,
    );
    if (
      !window.isWorking ||
      !window.startTime ||
      !window.endTime ||
      input.startsAt < combineDateAndTime(input.startsAt, window.startTime) ||
      endsAt > combineDateAndTime(input.startsAt, window.endTime)
    ) {
      throw new ConflictException(
        'O horário solicitado está fora do expediente do barbeiro.',
      );
    }

    return this.appointmentsRepository.createWithConflictCheck({
      customerId,
      barberId: input.barberId,
      startsAt: input.startsAt,
      endsAt,
      totalAmount,
      source: AppointmentSource.PLATFORM,
      services: resolvedServices.map((service) => ({
        serviceId: service.id,
        serviceName: service.name,
        price: service.price,
        durationMinutes: service.durationMinutes,
        pointsEarned: service.pointsEarned,
      })),
    });
  }
}
