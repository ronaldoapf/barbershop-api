import { Test, TestingModule } from '@nestjs/testing';
import { LogoutUseCase } from './logout.use-case';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { ITokenService } from '../domain/token.service.interface';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;

  const sessionsRepository = { delete: jest.fn() };
  const tokenService = { verifyRefreshToken: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
        { provide: ISessionsRepository, useValue: sessionsRepository },
        { provide: ITokenService, useValue: tokenService },
      ],
    }).compile();

    useCase = module.get(LogoutUseCase);
  });

  it('deletes the session referenced by a valid refresh token', async () => {
    tokenService.verifyRefreshToken.mockReturnValue({
      sub: 'user-1',
      sessionId: 'session-1',
    });

    await useCase.execute('valid-refresh-token');

    expect(sessionsRepository.delete).toHaveBeenCalledWith('session-1');
  });

  it('does nothing when the refresh token is invalid', async () => {
    tokenService.verifyRefreshToken.mockImplementation(() => {
      throw new Error('invalid token');
    });

    await expect(useCase.execute('bad-token')).resolves.toBeUndefined();
    expect(sessionsRepository.delete).not.toHaveBeenCalled();
  });
});
