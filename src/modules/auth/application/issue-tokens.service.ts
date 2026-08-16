import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UserEntity } from '../../users/domain/user.entity';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { ITokenService } from '../domain/token.service.interface';
import { hashToken } from './token-hash.util';

export interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class IssueTokensService {
  constructor(
    private readonly sessionsRepository: ISessionsRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async issue(
    user: UserEntity,
    context: RequestContext = {},
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
      barberId: null,
    });
    const refreshToken = this.tokenService.signRefreshToken({
      sub: user.id,
      sessionId,
    });

    await this.sessionsRepository.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}

export { REFRESH_TOKEN_TTL_MS };
