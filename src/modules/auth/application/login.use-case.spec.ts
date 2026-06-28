import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginUseCase } from './login.use-case';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { UserEntity } from '../../users/domain/user.entity';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';

const mockUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
  Object.assign(new UserEntity(), {
    id: 'user-1',
    email: 'ana@test.com',
    passwordHash: 'hashed-password',
    role: UserRole.CUSTOMER,
    disabledAt: null,
    ...overrides,
  });

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let usersRepo: jest.Mocked<IUsersRepository>;
  let sessionsRepo: jest.Mocked<ISessionsRepository>;
  let bcryptService: jest.Mocked<BcryptService>;

  beforeEach(() => {
    usersRepo = { findByEmail: jest.fn(), findById: jest.fn() } as unknown as jest.Mocked<IUsersRepository>;
    sessionsRepo = { create: jest.fn() } as unknown as jest.Mocked<ISessionsRepository>;
    const jwtService = { sign: jest.fn().mockReturnValue('token') } as unknown as JwtService;
    const configService = { get: jest.fn().mockReturnValue('secret') } as unknown as ConfigService;
    bcryptService = { encrypt: jest.fn().mockResolvedValue('hashed'), compare: jest.fn() } as unknown as jest.Mocked<BcryptService>;
    useCase = new LoginUseCase(usersRepo, sessionsRepo, jwtService, configService, bcryptService);
  });

  it('throws UnauthorizedException when user not found', async () => {
    usersRepo.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when password is wrong', async () => {
    usersRepo.findByEmail.mockResolvedValue(mockUser());
    bcryptService.compare.mockResolvedValue(false);
    await expect(useCase.execute({ email: 'ana@test.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when user is disabled', async () => {
    usersRepo.findByEmail.mockResolvedValue(mockUser({ disabledAt: new Date() }));
    await expect(useCase.execute({ email: 'ana@test.com', password: 'password123' })).rejects.toThrow(ForbiddenException);
  });

  it('returns tokens on valid credentials', async () => {
    usersRepo.findByEmail.mockResolvedValue(mockUser());
    bcryptService.compare.mockResolvedValue(true);
    sessionsRepo.create.mockResolvedValue(undefined);
    const result = await useCase.execute({ email: 'ana@test.com', password: 'password123' });
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });
});
