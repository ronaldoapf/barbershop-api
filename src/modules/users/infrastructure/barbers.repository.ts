import { Injectable } from '@nestjs/common';
import { Barber, User } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PaginationHelper } from '../../../shared/application/pagination.helper';

type BarberWithUser = Barber & { user: User };

@Injectable()
export class BarbersRepository implements IBarbersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { userId: string; commissionPercentage: number }): Promise<BarberEntity> {
    const record = await this.prisma.barber.create({
      data: { userId: data.userId, commissionPercentage: data.commissionPercentage },
      include: { user: true },
    });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<BarberEntity | null> {
    const record = await this.prisma.barber.findFirst({
      where: { id, disabledAt: null },
      include: { user: true },
    });
    return record ? this.toEntity(record) : null;
  }

  async findByUserId(userId: string): Promise<BarberEntity | null> {
    const record = await this.prisma.barber.findFirst({
      where: { userId, disabledAt: null },
      include: { user: true },
    });
    return record ? this.toEntity(record) : null;
  }

  async findAll(params: { page: number; limit: number }): Promise<PaginatedResult<BarberEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(params.page, params.limit);
    const where = { disabledAt: null };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.barber.findMany({ where, skip, take, include: { user: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.barber.count({ where }),
    ]);
    return { data: records.map((r) => this.toEntity(r)), total, page: params.page, limit: params.limit };
  }

  async update(id: string, data: Partial<{ commissionPercentage: number }>): Promise<BarberEntity> {
    const record = await this.prisma.barber.update({
      where: { id, disabledAt: null },
      data,
      include: { user: true },
    });
    return this.toEntity(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.barber.update({ where: { id }, data: { disabledAt: new Date() } });
  }

  private toEntity(record: BarberWithUser): BarberEntity {
    const e = new BarberEntity();
    e.id = record.id;
    e.userId = record.userId;
    e.commissionPercentage = Number(record.commissionPercentage);
    e.createdAt = record.createdAt;
    e.disabledAt = record.disabledAt;
    e.user = Object.assign(new UserEntity(), {
      id: record.user.id,
      name: record.user.name,
      email: record.user.email,
      phone: record.user.phone,
      role: record.user.role as UserRole,
      loyaltyPoints: record.user.loyaltyPoints,
      avatarUrl: record.user.avatarUrl,
      avatarStorageKey: record.user.avatarStorageKey,
      createdAt: record.user.createdAt,
      disabledAt: record.user.disabledAt,
    });
    return e;
  }
}
