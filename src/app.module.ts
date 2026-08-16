import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/infrastructure/prisma.module';
import { BcryptModule } from './shared/infrastructure/bcrypt.module';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseExceptionFilter } from './shared/filters/database-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './shared/infrastructure/health.controller';
import { UsersModule } from './modules/users/infrastructure/users.module';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { SettingsModule } from './modules/settings/infrastructure/settings.module';
import { BarbersModule } from './modules/barbers/infrastructure/barbers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BcryptModule,
    UsersModule,
    AuthModule,
    SettingsModule,
    BarbersModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: DatabaseExceptionFilter }],
})
export class AppModule {}
