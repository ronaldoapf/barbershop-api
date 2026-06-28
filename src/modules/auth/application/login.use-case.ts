import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { LoginDto } from '../dto/login.dto';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly sessionsRepository: ISessionsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly bcryptService: BcryptService,
  ) {}

  async execute(
    dto: LoginDto,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user || !user.passwordHash) throw new UnauthorizedException('Credenciais inválidas');
    if (user.disabledAt) throw new ForbiddenException('Conta desativada');

    const valid = await this.bcryptService.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.issueTokens(user.id, user.role, meta);
  }

  async issueTokens(
    userId: string,
    role: UserRole,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = randomUUID();
    const accessToken = this.jwtService.sign({ sub: userId, role });
    const refreshToken = this.jwtService.sign(
      { sub: userId, jti: sessionId },
      { secret: this.configService.get<string>('JWT_REFRESH_SECRET'), expiresIn: '7d' },
    );
    const refreshTokenHash = await this.bcryptService.encrypt(refreshToken);

    await this.sessionsRepository.create({
      id: sessionId,
      userId,
      refreshTokenHash,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken };
  }
}
