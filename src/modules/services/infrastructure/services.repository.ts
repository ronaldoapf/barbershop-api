import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Service } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { PaginationHelper } from '../../../shared/application/pagination.helper';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import {
  CreateServiceData,
  IServicesRepository,
  UpdateServiceData,
} from '../domain/services.repository.interface';
import { ItemStatus } from '../domain/item-status.enum';
import { ServiceEntity } from '../domain/service.entity';

@Injectable()
export class ServicesRepository implements IServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateServiceData): Promise<ServiceEntity> {
    const { barberIds, ...serviceData } = data;
    const uniqueBarberIds = [...new Set(barberIds ?? [])];

    if (uniqueBarberIds.length === 0) {
      const record = await this.prisma.service.create({ data: serviceData });
      return this.toEntity(record);
    }

    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const service = await tx.service.create({ data: serviceData });
        await tx.barberService.createMany({
          data: uniqueBarberIds.map((barberId) => ({
            barberId,
            serviceId: service.id,
          })),
        });
        return service;
      });
      return this.toEntity(record);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new NotFoundException('Um ou mais barbeiros não encontrados.');
      }
      throw e;
    }
  }

  async update(id: string, data: UpdateServiceData): Promise<ServiceEntity> {
    const record = await this.prisma.service.update({ where: { id }, data });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<ServiceEntity | null> {
    const record = await this.prisma.service.findFirst({
      where: { id, disabledAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async list(
    page: number,
    limit: number,
    status?: ItemStatus,
  ): Promise<PaginatedResult<ServiceEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(page, limit);
    const where: Prisma.ServiceWhereInput = {
      disabledAt: null,
      ...(status ? { status } : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take,
        orderBy: { order: 'asc' },
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      data: records.map((record) => this.toEntity(record)),
      total,
      page,
      limit,
    };
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.service.update({
      where: { id },
      data: { disabledAt: new Date() },
    });
  }

  private toEntity(record: Service): ServiceEntity {
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
