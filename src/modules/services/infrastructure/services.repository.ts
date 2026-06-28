import { Injectable } from '@nestjs/common';
import { Prisma, Service } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';
import { ItemStatus } from '../domain/item-status.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PaginationHelper } from '../../../shared/application/pagination.helper';

@Injectable()
export class ServicesRepository implements IServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { categoryId: string | null; name: string; description: string | null; price: number; durationMinutes: number; order: number; pointsEarned: number; pointsRequired: number }): Promise<ServiceEntity> {
    return this.toEntity(await this.prisma.service.create({ data }));
  }

  async findById(id: string): Promise<ServiceEntity | null> {
    const r = await this.prisma.service.findFirst({ where: { id, disabledAt: null } });
    return r ? this.toEntity(r) : null;
  }

  async findAll(params: { categoryId?: string; status?: ItemStatus; page: number; limit: number }): Promise<PaginatedResult<ServiceEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(params.page, params.limit);
    const where: Prisma.ServiceWhereInput = { disabledAt: null };
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.status) where.status = params.status;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({ where, skip, take, orderBy: { order: 'asc' } }),
      this.prisma.service.count({ where }),
    ]);
    return { data: records.map((r) => this.toEntity(r)), total, page: params.page, limit: params.limit };
  }

  async update(id: string, data: Partial<Omit<ServiceEntity, 'id' | 'createdAt' | 'disabledAt'>>): Promise<ServiceEntity> {
    return this.toEntity(await this.prisma.service.update({ where: { id }, data }));
  }

  async updateStatus(id: string, status: ItemStatus): Promise<ServiceEntity> {
    return this.toEntity(await this.prisma.service.update({ where: { id }, data: { status } }));
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.service.update({ where: { id }, data: { disabledAt: new Date() } });
  }

  private toEntity(r: Service): ServiceEntity {
    const e = new ServiceEntity();
    e.id = r.id; e.categoryId = r.categoryId; e.name = r.name; e.description = r.description;
    e.price = r.price; e.durationMinutes = r.durationMinutes; e.status = r.status as ItemStatus;
    e.order = r.order; e.pointsEarned = r.pointsEarned; e.pointsRequired = r.pointsRequired;
    e.createdAt = r.createdAt; e.disabledAt = r.disabledAt;
    return e;
  }
}
