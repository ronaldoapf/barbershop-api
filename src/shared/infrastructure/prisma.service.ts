import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const isLocal =
      process.env.DATABASE_URL?.includes('localhost') ||
      process.env.DATABASE_URL?.includes('127.0.0.1');

    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      ...(!isLocal && { ssl: { rejectUnauthorized: false } }),
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
