import { Module } from '@nestjs/common';
import { BarbersModule } from '../../barbers/infrastructure/barbers.module';
import { SettingsModule } from '../../settings/infrastructure/settings.module';
import { UsersModule } from '../../users/infrastructure/users.module';
import { AcceptInviteUseCase } from '../application/accept-invite.use-case';
import { ResendInviteUseCase } from '../application/resend-invite.use-case';
import { SendInviteUseCase } from '../application/send-invite.use-case';
import { ValidateInviteTokenUseCase } from '../application/validate-invite-token.use-case';
import { IBarberInvitesRepository } from '../domain/barber-invites.repository.interface';
import { BarberInvitesController } from './barber-invites.controller';
import { BarberInvitesRepository } from './barber-invites.repository';

@Module({
  imports: [UsersModule, BarbersModule, SettingsModule],
  controllers: [BarberInvitesController],
  providers: [
    { provide: IBarberInvitesRepository, useClass: BarberInvitesRepository },
    SendInviteUseCase,
    ValidateInviteTokenUseCase,
    AcceptInviteUseCase,
    ResendInviteUseCase,
  ],
})
export class BarberInvitesModule {}
