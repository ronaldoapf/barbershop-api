import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';
import { hashToken } from '../../../shared/utils/token.util';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { GetSettingUseCase } from '../../settings/application/get-setting.use-case';
import { UserRole } from '../../users/domain/user-role.enum';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { IBarberInvitesRepository } from '../domain/barber-invites.repository.interface';

const DEFAULT_COMMISSION_PERCENTAGE = 0;

export interface AcceptInviteInput {
  token: string;
  password?: string;
}

@Injectable()
export class AcceptInviteUseCase {
  constructor(
    private readonly barberInvitesRepository: IBarberInvitesRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly barbersRepository: IBarbersRepository,
    private readonly getSettingUseCase: GetSettingUseCase,
    private readonly bcryptService: BcryptService,
  ) {}

  async execute(input: AcceptInviteInput): Promise<BarberEntity> {
    const invite = await this.barberInvitesRepository.findByTokenHash(
      hashToken(input.token),
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

    let passwordHash: string | undefined;
    if (!user.passwordHash) {
      if (!input.password) {
        throw new BadRequestException(
          'Senha é obrigatória para ativar a conta.',
        );
      }
      passwordHash = await this.bcryptService.encrypt(input.password);
    }

    await this.usersRepository.update(user.id, {
      role: UserRole.BARBER,
      ...(passwordHash && { passwordHash }),
    });

    const commissionRaw = await this.getSettingUseCase.execute(
      'default_commission_percentage',
    );
    const commissionPercentage = commissionRaw
      ? Number(commissionRaw)
      : DEFAULT_COMMISSION_PERCENTAGE;

    const barber = await this.barbersRepository.create({
      userId: user.id,
      commissionPercentage,
    });

    await this.barberInvitesRepository.markAccepted(invite.id);

    return barber;
  }
}
