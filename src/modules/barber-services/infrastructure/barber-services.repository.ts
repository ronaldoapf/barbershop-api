import { ConflictException, Injectable } from '@nestjs/common';
import { BarberService, Prisma, Service } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { ItemStatus } from '../../services/domain/item-status.enum';
import { ServiceEntity } from '../../services/domain/service.entity';
import { IBarberServicesRepository } from '../domain/barber-services.repository.interface';
import { BarberServiceEntity } from '../domain/barber-service.entity';

@Injectable()
export class BarberServicesRepository implements IBarberServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assign(
    barberId: string,
    serviceId: string,
  ): Promise<BarberServiceEntity> {
    try {
      const record = await this.prisma.barberService.create({
        data: { barberId, serviceId },
      });
      return this.toEntity(record);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Este serviço já está atribuído a este barbeiro.',
        );
      }
      throw e;
    }
  }

  async unassign(barberId: string, serviceId: string): Promise<void> {
    await this.prisma.barberService.delete({
      where: { barberId_serviceId: { barberId, serviceId } },
    });
  }

  async listByBarber(barberId: string): Promise<ServiceEntity[]> {
    const records = await this.prisma.barberService.findMany({
      where: { barberId },
      include: { service: true },
      orderBy: { service: { order: 'asc' } },
    });

    return records.map((record) => this.toServiceEntity(record.service));
  }

  async listServiceIdsByBarber(barberId: string): Promise<string[]> {
    const records = await this.prisma.barberService.findMany({
      where: { barberId },
      select: { serviceId: true },
    });

    return records.map((record) => record.serviceId);
  }

  private toEntity(record: BarberService): BarberServiceEntity {
    return {
      id: record.id,
      barberId: record.barberId,
      serviceId: record.serviceId,
      createdAt: record.createdAt,
    };
  }

  private toServiceEntity(record: Service): ServiceEntity {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      price: record.price,
      durationMinutes: record.durationMinutes,
      status: record.status as ItemStatus,
      order: record.order,
      pointsEarned: record.pointsEarned,
      pointsRequired: record.pointsRequired,
      createdAt: record.createdAt,
      disabledAt: record.disabledAt,
    };
  }
}
