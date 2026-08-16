import { Test, TestingModule } from '@nestjs/testing';
import { LoginGoogleUseCase } from './login-google.use-case';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { IAccountsRepository } from '../domain/accounts.repository.interface';
import { OAuthProvider } from '../domain/oauth-provider.enum';
import { IssueTokensService } from './issue-tokens.service';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { AccountEntity } from '../domain/account.entity';

describe('LoginGoogleUseCase', () => {
  let useCase: LoginGoogleUseCase;

  const usersRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
  };
  const accountsRepository = {
    findByProviderAccountId: jest.fn(),
    create: jest.fn(),
  };
  const issueTokensService = { issue: jest.fn() };

  const user: UserEntity = {
    id: 'user-1',
    name: 'Google User',
    email: 'google@example.com',
    phone: null,
    passwordHash: null,
    role: UserRole.CUSTOMER,
    loyaltyPoints: 0,
    avatarUrl: null,
    avatarStorageKey: null,
    createdAt: new Date(),
    disabledAt: null,
  };

  const account: AccountEntity = {
    id: 'account-1',
    userId: user.id,
    provider: OAuthProvider.GOOGLE,
    providerAccountId: 'google-sub-1',
    createdAt: new Date(),
  };

  const tokens = { accessToken: 'access', refreshToken: 'refresh' };
  const profile = {
    providerAccountId: 'google-sub-1',
    email: user.email,
    name: user.name,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginGoogleUseCase,
        { provide: IUsersRepository, useValue: usersRepository },
        { provide: IAccountsRepository, useValue: accountsRepository },
        { provide: IssueTokensService, useValue: issueTokensService },
      ],
    }).compile();

    useCase = module.get(LoginGoogleUseCase);
  });

  it('issues tokens for an existing linked account', async () => {
    accountsRepository.findByProviderAccountId.mockResolvedValue(account);
    usersRepository.findById.mockResolvedValue(user);
    issueTokensService.issue.mockResolvedValue(tokens);

    const result = await useCase.execute(profile);

    expect(accountsRepository.findByProviderAccountId).toHaveBeenCalledWith(
      OAuthProvider.GOOGLE,
      profile.providerAccountId,
    );
    expect(accountsRepository.create).not.toHaveBeenCalled();
    expect(result).toEqual(tokens);
  });

  it('links Google to an existing user found by email when no account exists', async () => {
    accountsRepository.findByProviderAccountId.mockResolvedValue(null);
    usersRepository.findByEmail.mockResolvedValue(user);
    issueTokensService.issue.mockResolvedValue(tokens);

    const result = await useCase.execute(profile);

    expect(usersRepository.create).not.toHaveBeenCalled();
    expect(accountsRepository.create).toHaveBeenCalledWith({
      userId: user.id,
      provider: OAuthProvider.GOOGLE,
      providerAccountId: profile.providerAccountId,
    });
    expect(result).toEqual(tokens);
  });

  it('creates a new CUSTOMER user when none exists for the email', async () => {
    accountsRepository.findByProviderAccountId.mockResolvedValue(null);
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockResolvedValue(user);
    issueTokensService.issue.mockResolvedValue(tokens);

    await useCase.execute(profile);

    expect(usersRepository.create).toHaveBeenCalledWith({
      name: profile.name,
      email: profile.email,
      role: UserRole.CUSTOMER,
    });
    expect(accountsRepository.create).toHaveBeenCalledWith({
      userId: user.id,
      provider: OAuthProvider.GOOGLE,
      providerAccountId: profile.providerAccountId,
    });
  });
});
