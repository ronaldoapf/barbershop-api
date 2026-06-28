import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { ISessionsRepository } from '../domain/sessions.repository.interface';

@Injectable()
export class SessionsRepository implements ISessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.session.create({ data });
  }

  async findById(id: string): Promise<{ id: string; userId: string; refreshTokenHash: string; expiresAt: Date } | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id } });
  }
}
