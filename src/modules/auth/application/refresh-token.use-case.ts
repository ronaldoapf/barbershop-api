import { Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { ITokenService } from '../domain/token.service.interface';
import { hashToken } from '../../../shared/utils/token.util';
import { REFRESH_TOKEN_TTL_MS, TokenPair } from './issue-tokens.service';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly sessionsRepository: ISessionsRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(refreshToken: string): Promise<TokenPair> {
    const payload = this.verify(refreshToken);

    const session = await this.sessionsRepository.findById(payload.sessionId);
    if (
      !session ||
      session.userId !== payload.sub ||
      session.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    if (!this.matchesStoredHash(refreshToken, session.refreshTokenHash)) {
      throw new UnauthorizedException('Refresh token inválido.');
    }

    const user = await this.usersRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const newRefreshToken = this.tokenService.signRefreshToken({
      sub: user.id,
      sessionId: session.id,
    });
    await this.sessionsRepository.updateRefreshTokenHash(
      session.id,
      hashToken(newRefreshToken),
      new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    );

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
      barberId: null,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  private verify(refreshToken: string): { sub: string; sessionId: string } {
    try {
      return this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido.');
    }
  }

  private matchesStoredHash(refreshToken: string, storedHash: string): boolean {
    const provided = Buffer.from(hashToken(refreshToken), 'hex');
    const stored = Buffer.from(storedHash, 'hex');
    return (
      provided.length === stored.length && timingSafeEqual(provided, stored)
    );
  }
}
