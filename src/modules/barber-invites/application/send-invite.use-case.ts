import { ConflictException, Injectable } from '@nestjs/common';
import { IMailService } from '../../../shared/mail/mail.service';
import { generateToken, hashToken } from '../../../shared/utils/token.util';
import { GetSettingUseCase } from '../../settings/application/get-setting.use-case';
import { UserRole } from '../../users/domain/user-role.enum';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { BarberInviteEntity } from '../domain/barber-invite.entity';
import { IBarberInvitesRepository } from '../domain/barber-invites.repository.interface';

const DEFAULT_INVITE_EXPIRY_DAYS = 7;

export interface SendInviteInput {
  name: string;
  email: string;
}

@Injectable()
export class SendInviteUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly barberInvitesRepository: IBarberInvitesRepository,
    private readonly getSettingUseCase: GetSettingUseCase,
    private readonly mailService: IMailService,
  ) {}

  async execute(input: SendInviteInput): Promise<BarberInviteEntity> {
    const existingUser = await this.usersRepository.findByEmail(input.email);

    let userId: string;
    let name: string;

    if (!existingUser) {
      const created = await this.usersRepository.create({
        name: input.name,
        email: input.email,
        role: UserRole.BARBER,
      });
      userId = created.id;
      name = created.name;
    } else if (existingUser.role === UserRole.CUSTOMER) {
      userId = existingUser.id;
      name = existingUser.name;
    } else {
      throw new ConflictException(
        'Este usuário já é barbeiro ou administrador.',
      );
    }

    const pendingInvite =
      await this.barberInvitesRepository.findByUserId(userId);
    if (pendingInvite && !pendingInvite.acceptedAt) {
      throw new ConflictException(
        'Já existe um convite pendente para este usuário. Utilize o reenvio.',
      );
    }

    const expiryDaysRaw = await this.getSettingUseCase.execute(
      'barber_invite_expiry_days',
    );
    const expiryDays = expiryDaysRaw
      ? Number(expiryDaysRaw)
      : DEFAULT_INVITE_EXPIRY_DAYS;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const token = generateToken();
    const invite = await this.barberInvitesRepository.create({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    });

    await this.mailService.sendBarberInviteEmail({
      to: input.email,
      name,
      token,
    });

    return invite;
  }
}
