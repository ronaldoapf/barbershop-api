import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  ITokenService,
  JwtPayload,
  RefreshTokenPayload,
} from '../domain/token.service.interface';

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });
  }

  signRefreshToken(payload: RefreshTokenPayload): string {
    return this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return this.jwtService.verify<RefreshTokenPayload>(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }
}

export { ACCESS_TOKEN_TTL_MS };
