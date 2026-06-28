import { UnauthorizedException } from '@nestjs/common';
import { GoogleOAuthUseCase } from './google-oauth.use-case';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { IAccountsRepository, OAuthProvider } from '../domain/accounts.repository.interface';
import { LoginUseCase } from './login.use-case';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';

describe('GoogleOAuthUseCase', () => {
  let useCase: GoogleOAuthUseCase;
  let usersRepo: jest.Mocked<IUsersRepository>;
  let accountsRepo: jest.Mocked<IAccountsRepository>;
  let loginUseCase: jest.Mocked<LoginUseCase>;

  const profile = { sub: 'google-sub-1', email: 'user@example.com', name: 'John Doe' };
  const tokens = { accessToken: 'access', refreshToken: 'refresh' };

  beforeEach(() => {
    usersRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<IUsersRepository>;
    accountsRepo = {
      findByProvider: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<IAccountsRepository>;
    loginUseCase = {
      issueTokens: jest.fn().mockResolvedValue(tokens),
    } as unknown as jest.Mocked<LoginUseCase>;
    useCase = new GoogleOAuthUseCase(usersRepo, accountsRepo, loginUseCase);
  });

  it('issues tokens for existing linked account', async () => {
    accountsRepo.findByProvider.mockResolvedValue({ userId: 'user-1' });
    usersRepo.findById.mockResolvedValue({ id: 'user-1', role: UserRole.CUSTOMER, disabledAt: null } as UserEntity);

    const result = await useCase.execute(profile);
    expect(result).toEqual(tokens);
    expect(loginUseCase.issueTokens).toHaveBeenCalledWith('user-1', UserRole.CUSTOMER, {});
  });

  it('throws UnauthorizedException when linked user is disabled', async () => {
    accountsRepo.findByProvider.mockResolvedValue({ userId: 'user-1' });
    usersRepo.findById.mockResolvedValue({ id: 'user-1', role: UserRole.CUSTOMER, disabledAt: new Date() } as UserEntity);

    await expect(useCase.execute(profile)).rejects.toThrow(UnauthorizedException);
  });

  it('links account and issues tokens for existing user by email', async () => {
    accountsRepo.findByProvider.mockResolvedValue(null);
    usersRepo.findByEmail.mockResolvedValue({ id: 'user-1', role: UserRole.CUSTOMER, disabledAt: null } as UserEntity);
    accountsRepo.create.mockResolvedValue(undefined);

    const result = await useCase.execute(profile);
    expect(accountsRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      provider: OAuthProvider.GOOGLE,
      providerAccountId: profile.sub,
    });
    expect(result).toEqual(tokens);
  });

  it('creates new user and links account when neither account nor email match', async () => {
    accountsRepo.findByProvider.mockResolvedValue(null);
    usersRepo.findByEmail.mockResolvedValue(null);
    usersRepo.create.mockResolvedValue({ id: 'new-user', role: UserRole.CUSTOMER, disabledAt: null } as UserEntity);
    accountsRepo.create.mockResolvedValue(undefined);

    const result = await useCase.execute(profile);
    expect(usersRepo.create).toHaveBeenCalledWith({
      name: profile.name,
      email: profile.email,
      phone: null,
      passwordHash: null,
      role: UserRole.CUSTOMER,
    });
    expect(accountsRepo.create).toHaveBeenCalledWith({
      userId: 'new-user',
      provider: OAuthProvider.GOOGLE,
      providerAccountId: profile.sub,
    });
    expect(result).toEqual(tokens);
  });
});
