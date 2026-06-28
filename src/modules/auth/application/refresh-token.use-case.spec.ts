import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { LoginUseCase } from './login.use-case';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let sessionsRepo: jest.Mocked<ISessionsRepository>;
  let usersRepo: jest.Mocked<IUsersRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let loginUseCase: jest.Mocked<LoginUseCase>;

  beforeEach(() => {
    sessionsRepo = { findById: jest.fn(), deleteById: jest.fn() } as unknown as jest.Mocked<ISessionsRepository>;
    usersRepo = { findById: jest.fn() } as unknown as jest.Mocked<IUsersRepository>;
    jwtService = { verify: jest.fn(), sign: jest.fn() } as unknown as jest.Mocked<JwtService>;
    loginUseCase = { issueTokens: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }) } as unknown as jest.Mocked<LoginUseCase>;
    const configService = { get: jest.fn().mockReturnValue('refresh-secret') } as unknown as ConfigService;
    useCase = new RefreshTokenUseCase(sessionsRepo, usersRepo, loginUseCase, jwtService, configService);
  });

  it('throws UnauthorizedException when JWT is invalid', async () => {
    jwtService.verify.mockImplementation(() => { throw new Error(); });
    await expect(useCase.execute('bad-token')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when session not found', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', jti: 'session-1' });
    sessionsRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('token')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when session is expired', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', jti: 'session-1' });
    sessionsRepo.findById.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: await bcrypt.hash('token', 1),
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(useCase.execute('token')).rejects.toThrow(UnauthorizedException);
  });

  it('rotates tokens on valid refresh', async () => {
    const token = 'valid-token';
    jwtService.verify.mockReturnValue({ sub: 'user-1', jti: 'session-1' });
    sessionsRepo.findById.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: await bcrypt.hash(token, 1),
      expiresAt: new Date(Date.now() + 100000),
    });
    usersRepo.findById.mockResolvedValue({ id: 'user-1', role: UserRole.CUSTOMER, disabledAt: null } as UserEntity);

    const result = await useCase.execute(token);
    expect(sessionsRepo.deleteById).toHaveBeenCalledWith('session-1');
    expect(result).toHaveProperty('accessToken');
  });
});
