import { ConflictException, Injectable } from '@nestjs/common';
import { Barber, Prisma, User } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { PaginationHelper } from '../../../shared/application/pagination.helper';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import {
  CreateBarberData,
  IBarbersRepository,
} from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';

type BarberWithUser = Barber & { user: User };

const includeUser = { user: true } satisfies Prisma.BarberInclude;

@Injectable()
export class BarbersRepository implements IBarbersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBarberData): Promise<BarberEntity> {
    try {
      const record = await this.prisma.barber.create({
        data,
        include: includeUser,
      });
      return this.toEntity(record);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Este usuário já possui um cadastro de barbeiro.',
        );
      }
      throw e;
    }
  }

  async findById(id: string): Promise<BarberEntity | null> {
    const record = await this.prisma.barber.findFirst({
      where: { id, disabledAt: null },
      include: includeUser,
    });
    return record ? this.toEntity(record) : null;
  }

  async findByUserId(userId: string): Promise<BarberEntity | null> {
    const record = await this.prisma.barber.findFirst({
      where: { userId, disabledAt: null },
      include: includeUser,
    });
    return record ? this.toEntity(record) : null;
  }

  async list(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<BarberEntity>> {
    const { skip, take } = PaginationHelper.getSkipTake(page, limit);
    const where: Prisma.BarberWhereInput = { disabledAt: null };

    const [records, total] = await Promise.all([
      this.prisma.barber.findMany({
        where,
        include: includeUser,
        skip,
        take,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.barber.count({ where }),
    ]);

    return {
      data: records.map((record) => this.toEntity(record)),
      total,
      page,
      limit,
    };
  }

  async updateCommission(
    id: string,
    commissionPercentage: number,
  ): Promise<BarberEntity> {
    const record = await this.prisma.barber.update({
      where: { id },
      data: { commissionPercentage },
      include: includeUser,
    });
    return this.toEntity(record);
  }

  private toEntity(record: BarberWithUser): BarberEntity {
    return {
      id: record.id,
      userId: record.userId,
      name: record.user.name,
      avatarUrl: record.user.avatarUrl,
      commissionPercentage: record.commissionPercentage.toNumber(),
      createdAt: record.createdAt,
      disabledAt: record.disabledAt,
    };
  }
}
