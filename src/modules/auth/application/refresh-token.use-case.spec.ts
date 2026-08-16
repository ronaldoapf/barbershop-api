import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import { RefreshTokenUseCase } from './refresh-token.use-case';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { ITokenService } from '../domain/token.service.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { SessionEntity } from '../domain/session.entity';

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;

  const usersRepository = { findById: jest.fn() };
  const sessionsRepository = {
    findById: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
  };
  const tokenService = {
    verifyRefreshToken: jest.fn(),
    signRefreshToken: jest.fn(),
    signAccessToken: jest.fn(),
  };

  const user: UserEntity = {
    id: 'user-1',
    name: 'Existing User',
    email: 'existing@example.com',
    phone: null,
    passwordHash: null,
    role: UserRole.CUSTOMER,
    loyaltyPoints: 0,
    avatarUrl: null,
    avatarStorageKey: null,
    createdAt: new Date(),
    disabledAt: null,
  };

  const rawRefreshToken = 'raw-refresh-token';

  const session: SessionEntity = {
    id: 'session-1',
    userId: user.id,
    refreshTokenHash: hash(rawRefreshToken),
    userAgent: null,
    ipAddress: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenUseCase,
        { provide: IUsersRepository, useValue: usersRepository },
        { provide: ISessionsRepository, useValue: sessionsRepository },
        { provide: ITokenService, useValue: tokenService },
      ],
    }).compile();

    useCase = module.get(RefreshTokenUseCase);
  });

  it('rotates the refresh token and issues a new access token', async () => {
    tokenService.verifyRefreshToken.mockReturnValue({
      sub: user.id,
      sessionId: session.id,
    });
    sessionsRepository.findById.mockResolvedValue(session);
    usersRepository.findById.mockResolvedValue(user);
    tokenService.signRefreshToken.mockReturnValue('new-refresh-token');
    tokenService.signAccessToken.mockReturnValue('new-access-token');

    const result = await useCase.execute(rawRefreshToken);

    expect(sessionsRepository.updateRefreshTokenHash).toHaveBeenCalledWith(
      session.id,
      hash('new-refresh-token'),
      expect.any(Date),
    );
    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  });

  it('throws UnauthorizedException when the token signature is invalid', async () => {
    tokenService.verifyRefreshToken.mockImplementation(() => {
      throw new Error('bad signature');
    });

    await expect(useCase.execute('bad-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the session no longer exists', async () => {
    tokenService.verifyRefreshToken.mockReturnValue({
      sub: user.id,
      sessionId: session.id,
    });
    sessionsRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(rawRefreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the session is expired', async () => {
    tokenService.verifyRefreshToken.mockReturnValue({
      sub: user.id,
      sessionId: session.id,
    });
    sessionsRepository.findById.mockResolvedValue({
      ...session,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(useCase.execute(rawRefreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the provided token does not match the stored hash', async () => {
    tokenService.verifyRefreshToken.mockReturnValue({
      sub: user.id,
      sessionId: session.id,
    });
    sessionsRepository.findById.mockResolvedValue(session);

    await expect(useCase.execute('a-different-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
