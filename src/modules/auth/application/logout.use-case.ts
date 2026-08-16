import { Injectable } from '@nestjs/common';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { ITokenService } from '../domain/token.service.interface';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly sessionsRepository: ISessionsRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      await this.sessionsRepository.delete(payload.sessionId);
    } catch {
      // token already invalid/expired — nothing left to revoke
    }
  }
}
