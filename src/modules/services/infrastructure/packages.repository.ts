import { Injectable } from '@nestjs/common';
import { Package, Service } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IPackagesRepository } from '../domain/packages.repository.interface';
import { PackageEntity } from '../domain/package.entity';
import { ServiceEntity } from '../domain/service.entity';
import { ItemStatus } from '../domain/item-status.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PaginationHelper } from '../../../shared/application/pagination.helper';

type PackageWithServices = Package & { packageServices: Array<{ service: Service }> };

@Injectable()
export class PackagesRepository implements IPackagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; description: string | null; price: number; order: number; pointsEarned: number; pointsRequired: number; serviceIds: string[] }): Promise<PackageEntity> {
    const { serviceIds, ...rest } = data;
    const record = await this.prisma.package.create({
      data: {
        ...rest,
        packageServices: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
      include: { packageServices: { include: { service: true } } },
    });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<PackageEntity | null> {
    const r = await this.prisma.package.findFirst({
      where: { id, disabledAt: null },
      include: { packageServices: { include: { service: true } } },
    });
    return r ? this.toEntity(r) : null;
  }

  async findAll(params: { page: number; limit: number }): Promise<PaginatedResult<PackageEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(params.page, params.limit);
    const where = { disabledAt: null };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.package.findMany({ where, skip, take, orderBy: { order: 'asc' }, include: { packageServices: { include: { service: true } } } }),
      this.prisma.package.count({ where }),
    ]);
    return { data: records.map((r) => this.toEntity(r)), total, page: params.page, limit: params.limit };
  }

  async update(id: string, data: Partial<{ name: string; description: string | null; price: number; order: number; pointsEarned: number; pointsRequired: number; serviceIds: string[] }>): Promise<PackageEntity> {
    const { serviceIds, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    if (serviceIds) {
      await this.prisma.packageService.deleteMany({ where: { packageId: id } });
      updateData.packageServices = { create: serviceIds.map((serviceId) => ({ serviceId })) };
    }
    const record = await this.prisma.package.update({ where: { id }, data: updateData, include: { packageServices: { include: { service: true } } } });
    return this.toEntity(record);
  }

  async updateStatus(id: string, status: ItemStatus): Promise<PackageEntity> {
    const record = await this.prisma.package.update({ where: { id }, data: { status }, include: { packageServices: { include: { service: true } } } });
    return this.toEntity(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.package.update({ where: { id }, data: { disabledAt: new Date() } });
  }

  private toEntity(r: PackageWithServices): PackageEntity {
    const e = new PackageEntity();
    e.id = r.id; e.name = r.name; e.description = r.description; e.price = r.price;
    e.status = r.status as ItemStatus; e.order = r.order; e.pointsEarned = r.pointsEarned;
    e.pointsRequired = r.pointsRequired; e.createdAt = r.createdAt; e.disabledAt = r.disabledAt;
    e.services = r.packageServices.map(({ service: s }) => {
      const se = new ServiceEntity();
      se.id = s.id; se.categoryId = s.categoryId; se.name = s.name; se.description = s.description;
      se.price = s.price; se.durationMinutes = s.durationMinutes; se.status = s.status as ItemStatus;
      se.order = s.order; se.pointsEarned = s.pointsEarned; se.pointsRequired = s.pointsRequired;
      se.createdAt = s.createdAt; se.disabledAt = s.disabledAt;
      return se;
    });
    return e;
  }
}
