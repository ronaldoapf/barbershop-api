import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/infrastructure/prisma.module';
import { BcryptModule } from './shared/infrastructure/bcrypt.module';
import { MailModule } from './shared/mail/mail.module';
import { APP_FILTER } from '@nestjs/core';
import { DatabaseExceptionFilter } from './shared/filters/database-exception.filter';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './shared/infrastructure/health.controller';
import { UsersModule } from './modules/users/infrastructure/users.module';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { SettingsModule } from './modules/settings/infrastructure/settings.module';
import { BarbersModule } from './modules/barbers/infrastructure/barbers.module';
import { BarberInvitesModule } from './modules/barber-invites/infrastructure/barber-invites.module';
import { ServicesModule } from './modules/services/infrastructure/services.module';
import { BarberServicesModule } from './modules/barber-services/infrastructure/barber-services.module';
import { WorkingHoursModule } from './modules/working-hours/infrastructure/working-hours.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BcryptModule,
    MailModule,
    UsersModule,
    AuthModule,
    SettingsModule,
    BarbersModule,
    BarberInvitesModule,
    ServicesModule,
    BarberServicesModule,
    WorkingHoursModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: DatabaseExceptionFilter }],
})
export class AppModule {}
