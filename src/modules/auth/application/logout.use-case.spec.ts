import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogoutUseCase } from './logout.use-case';
import { ISessionsRepository } from '../domain/sessions.repository.interface';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let sessionsRepo: jest.Mocked<ISessionsRepository>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    sessionsRepo = { deleteById: jest.fn() } as unknown as jest.Mocked<ISessionsRepository>;
    jwtService = { verify: jest.fn() } as unknown as jest.Mocked<JwtService>;
    const configService = { get: jest.fn().mockReturnValue('refresh-secret') } as unknown as ConfigService;
    useCase = new LogoutUseCase(sessionsRepo, jwtService, configService);
  });

  it('deletes session when token is valid', async () => {
    jwtService.verify.mockReturnValue({ jti: 'session-1' });
    sessionsRepo.deleteById.mockResolvedValue(undefined);

    await useCase.execute('valid-token');
    expect(sessionsRepo.deleteById).toHaveBeenCalledWith('session-1');
  });

  it('does not throw when token is invalid', async () => {
    jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });

    await expect(useCase.execute('bad-token')).resolves.toBeUndefined();
    expect(sessionsRepo.deleteById).not.toHaveBeenCalled();
  });

  it('does not throw when deleteById throws', async () => {
    jwtService.verify.mockReturnValue({ jti: 'session-1' });
    sessionsRepo.deleteById.mockRejectedValue(new Error('db error'));

    await expect(useCase.execute('valid-token')).resolves.toBeUndefined();
  });
});
