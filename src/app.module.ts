import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/infrastructure/prisma.module';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseExceptionFilter } from './shared/filters/database-exception.filter';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
  ],
})
export class AppModule {}
