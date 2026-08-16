import { Injectable } from '@nestjs/common';
import { Prisma, Session } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import {
  CreateSessionData,
  ISessionsRepository,
} from '../domain/sessions.repository.interface';
import { SessionEntity } from '../domain/session.entity';

@Injectable()
export class SessionsRepository implements ISessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSessionData): Promise<SessionEntity> {
    const record = await this.prisma.session.create({ data });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<SessionEntity | null> {
    const record = await this.prisma.session.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async updateRefreshTokenHash(
    id: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<SessionEntity> {
    const record = await this.prisma.session.update({
      where: { id },
      data: { refreshTokenHash, expiresAt },
    });
    return this.toEntity(record);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.session.delete({ where: { id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        return;
      }
      throw e;
    }
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  private toEntity(record: Session): SessionEntity {
    return {
      id: record.id,
      userId: record.userId,
      refreshTokenHash: record.refreshTokenHash,
      userAgent: record.userAgent,
      ipAddress: record.ipAddress,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    };
  }
}
