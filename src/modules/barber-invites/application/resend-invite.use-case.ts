import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IMailService } from '../../../shared/mail/mail.service';
import { generateToken, hashToken } from '../../../shared/utils/token.util';
import { GetSettingUseCase } from '../../settings/application/get-setting.use-case';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { IBarberInvitesRepository } from '../domain/barber-invites.repository.interface';

const DEFAULT_INVITE_EXPIRY_DAYS = 7;

@Injectable()
export class ResendInviteUseCase {
  constructor(
    private readonly barberInvitesRepository: IBarberInvitesRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly getSettingUseCase: GetSettingUseCase,
    private readonly mailService: IMailService,
  ) {}

  async execute(id: string): Promise<void> {
    const invite = await this.barberInvitesRepository.findById(id);
    if (!invite) {
      throw new NotFoundException('Convite não encontrado.');
    }
    if (invite.acceptedAt) {
      throw new ConflictException('Este convite já foi aceito.');
    }

    const user = await this.usersRepository.findById(invite.userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const expiryDaysRaw = await this.getSettingUseCase.execute(
      'barber_invite_expiry_days',
    );
    const expiryDays = expiryDaysRaw
      ? Number(expiryDaysRaw)
      : DEFAULT_INVITE_EXPIRY_DAYS;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const token = generateToken();
    await this.barberInvitesRepository.updateToken(
      id,
      hashToken(token),
      expiresAt,
    );

    await this.mailService.sendBarberInviteEmail({
      to: user.email,
      name: user.name,
      token,
    });
  }
}
