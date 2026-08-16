import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import {
  CreateUserData,
  IUsersRepository,
  UpdateUserData,
} from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: { id, disabledAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findFirst({
      where: { email, disabledAt: null },
    });
    return record ? this.toEntity(record) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    try {
      const record = await this.prisma.user.create({ data });
      return this.toEntity(record);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Já existe um usuário com este e-mail.');
      }
      throw e;
    }
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    const record = await this.prisma.user.update({ where: { id }, data });
    return this.toEntity(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { disabledAt: new Date() },
    });
  }

  private toEntity(record: User): UserEntity {
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      phone: record.phone,
      passwordHash: record.passwordHash,
      role: record.role as UserRole,
      loyaltyPoints: record.loyaltyPoints,
      avatarUrl: record.avatarUrl,
      avatarStorageKey: record.avatarStorageKey,
      createdAt: record.createdAt,
      disabledAt: record.disabledAt,
    };
  }
}
