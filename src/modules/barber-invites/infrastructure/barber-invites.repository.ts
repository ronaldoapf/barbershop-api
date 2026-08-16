import { Injectable } from '@nestjs/common';
import { BarberInvite } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { BarberInviteEntity } from '../domain/barber-invite.entity';
import {
  CreateBarberInviteData,
  IBarberInvitesRepository,
} from '../domain/barber-invites.repository.interface';

@Injectable()
export class BarberInvitesRepository implements IBarberInvitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBarberInviteData): Promise<BarberInviteEntity> {
    const record = await this.prisma.barberInvite.create({ data });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<BarberInviteEntity | null> {
    const record = await this.prisma.barberInvite.findUnique({
      where: { id },
    });
    return record ? this.toEntity(record) : null;
  }

  async findByUserId(userId: string): Promise<BarberInviteEntity | null> {
    const record = await this.prisma.barberInvite.findUnique({
      where: { userId },
    });
    return record ? this.toEntity(record) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<BarberInviteEntity | null> {
    const record = await this.prisma.barberInvite.findFirst({
      where: { tokenHash },
    });
    return record ? this.toEntity(record) : null;
  }

  async markAccepted(id: string): Promise<BarberInviteEntity> {
    const record = await this.prisma.barberInvite.update({
      where: { id },
      data: { acceptedAt: new Date() },
    });
    return this.toEntity(record);
  }

  async updateToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<BarberInviteEntity> {
    const record = await this.prisma.barberInvite.update({
      where: { id },
      data: { tokenHash, expiresAt },
    });
    return this.toEntity(record);
  }

  private toEntity(record: BarberInvite): BarberInviteEntity {
    return {
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      acceptedAt: record.acceptedAt,
      createdAt: record.createdAt,
    };
  }
}
