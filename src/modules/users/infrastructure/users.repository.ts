import { Injectable, NotFoundException } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PaginationHelper } from '../../../shared/application/pagination.helper';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(record: PrismaUser): UserEntity {
    const entity = new UserEntity();
    entity.id = record.id;
    entity.name = record.name;
    entity.email = record.email;
    entity.phone = record.phone;
    entity.passwordHash = record.passwordHash;
    entity.role = record.role as unknown as UserRole;
    entity.loyaltyPoints = record.loyaltyPoints;
    entity.avatarUrl = record.avatarUrl;
    entity.avatarStorageKey = record.avatarStorageKey;
    entity.createdAt = record.createdAt;
    entity.disabledAt = record.disabledAt;
    return entity;
  }

  async create(data: {
    name: string;
    email: string;
    phone: string | null;
    passwordHash: string | null;
    role: UserRole;
  }): Promise<UserEntity> {
    const record = await this.prisma.user.create({ data: { ...data, role: data.role as unknown as PrismaUser['role'] } });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({ where: { id, disabledAt: null } });
    return record ? this.toEntity(record) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({ where: { email, disabledAt: null } });
    return record ? this.toEntity(record) : null;
  }

  async update(
    id: string,
    data: Partial<{ name: string; phone: string | null; avatarUrl: string | null; avatarStorageKey: string | null }>,
  ): Promise<UserEntity> {
    try {
      const record = await this.prisma.user.update({ where: { id, disabledAt: null }, data });
      return this.toEntity(record);
    } catch {
      throw new NotFoundException('Usuário não encontrado');
    }
  }

  async updateLoyaltyPoints(id: string, delta: number): Promise<void> {
    await this.prisma.user.update({
      where: { id, disabledAt: null },
      data: { loyaltyPoints: { increment: delta } },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { disabledAt: new Date() },
    });
  }

  async findAll(params: { role?: UserRole; page: number; limit: number }): Promise<PaginatedResult<UserEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(params.page, params.limit);
    const where = {
      disabledAt: null,
      ...(params.role ? { role: params.role as unknown as PrismaUser['role'] } : {}),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, skip, take }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: records.map((r) => this.toEntity(r)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }
}
