import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { JwtPayload } from '../domain/token.service.interface';

function extractFromCookie(req: Request): string | null {
  return req?.cookies?.accessToken ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersRepository: IUsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<UserEntity> {
    const user = await this.usersRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }
    return user;
  }
}
