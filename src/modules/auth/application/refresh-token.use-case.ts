import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { LoginUseCase } from './login.use-case';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly sessionsRepository: ISessionsRepository,
    private readonly usersRepository: IUsersRepository,
    private readonly loginUseCase: LoginUseCase,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly bcryptService: BcryptService,
  ) {}

  async execute(
    refreshToken: string,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string; jti: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token de atualização inválido');
    }

    const session = await this.sessionsRepository.findById(payload.jti);
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Sessão não encontrada');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada');
    }

    const valid = await this.bcryptService.compare(refreshToken, session.refreshTokenHash);
    if (!valid) throw new UnauthorizedException('Token de atualização inválido');

    const user = await this.usersRepository.findById(payload.sub);
    if (!user || user.disabledAt) throw new UnauthorizedException('Usuário não encontrado');

    await this.sessionsRepository.deleteById(payload.jti);

    return this.loginUseCase.issueTokens(user.id, user.role, meta);
  }
}
