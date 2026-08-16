import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LoginLocalUseCase } from './login-local.use-case';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';
import { IssueTokensService } from './issue-tokens.service';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';

describe('LoginLocalUseCase', () => {
  let useCase: LoginLocalUseCase;

  const usersRepository = { findByEmail: jest.fn() };
  const bcryptService = { compare: jest.fn() };
  const issueTokensService = { issue: jest.fn() };

  const user: UserEntity = {
    id: 'user-1',
    name: 'Existing User',
    email: 'existing@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.CUSTOMER,
    loyaltyPoints: 0,
    avatarUrl: null,
    avatarStorageKey: null,
    createdAt: new Date(),
    disabledAt: null,
  };

  const tokens = { accessToken: 'access', refreshToken: 'refresh' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginLocalUseCase,
        { provide: IUsersRepository, useValue: usersRepository },
        { provide: BcryptService, useValue: bcryptService },
        { provide: IssueTokensService, useValue: issueTokensService },
      ],
    }).compile();

    useCase = module.get(LoginLocalUseCase);
  });

  it('issues tokens when credentials are valid', async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    bcryptService.compare.mockResolvedValue(true);
    issueTokensService.issue.mockResolvedValue(tokens);

    const result = await useCase.execute({
      email: user.email,
      password: 'plain-password',
    });

    expect(bcryptService.compare).toHaveBeenCalledWith(
      'plain-password',
      'hashed',
    );
    expect(result).toEqual(tokens);
  });

  it('throws UnauthorizedException when the user does not exist', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'missing@example.com', password: 'x' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(issueTokensService.issue).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the user has no password set', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      ...user,
      passwordHash: null,
    });

    await expect(
      useCase.execute({ email: user.email, password: 'x' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the password does not match', async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    bcryptService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: user.email, password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(issueTokensService.issue).not.toHaveBeenCalled();
  });
});
