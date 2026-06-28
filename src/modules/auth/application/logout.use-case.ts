import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ISessionsRepository } from '../domain/sessions.repository.interface';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly sessionsRepository: ISessionsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<{ jti: string }>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      await this.sessionsRepository.deleteById(payload.jti);
    } catch {
      // Best-effort: ignore invalid tokens on logout
    }
  }
}
