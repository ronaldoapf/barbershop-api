import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashToken } from '../../../shared/utils/token.util';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { IBarberInvitesRepository } from '../domain/barber-invites.repository.interface';

export interface InvitePreview {
  name: string;
  email: string;
  expiresAt: Date;
}

@Injectable()
export class ValidateInviteTokenUseCase {
  constructor(
    private readonly barberInvitesRepository: IBarberInvitesRepository,
    private readonly usersRepository: IUsersRepository,
  ) {}

  async execute(token: string): Promise<InvitePreview> {
    const invite = await this.barberInvitesRepository.findByTokenHash(
      hashToken(token),
    );
    if (!invite) {
      throw new NotFoundException('Convite não encontrado.');
    }
    if (invite.acceptedAt) {
      throw new ConflictException('Este convite já foi aceito.');
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw new GoneException('Este convite expirou.');
    }

    const user = await this.usersRepository.findById(invite.userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return { name: user.name, email: user.email, expiresAt: invite.expiresAt };
  }
}
