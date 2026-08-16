import { Test, TestingModule } from '@nestjs/testing';
import { RegisterLocalUseCase } from './register-local.use-case';
import { CreateUserUseCase } from '../../users/application/create-user.use-case';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';
import { IssueTokensService } from './issue-tokens.service';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';

describe('RegisterLocalUseCase', () => {
  let useCase: RegisterLocalUseCase;

  const createUserUseCase = { execute: jest.fn() };
  const bcryptService = { encrypt: jest.fn(), compare: jest.fn() };
  const issueTokensService = { issue: jest.fn() };

  const user: UserEntity = {
    id: 'user-1',
    name: 'New User',
    email: 'new@example.com',
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
        RegisterLocalUseCase,
        { provide: CreateUserUseCase, useValue: createUserUseCase },
        { provide: BcryptService, useValue: bcryptService },
        { provide: IssueTokensService, useValue: issueTokensService },
      ],
    }).compile();

    useCase = module.get(RegisterLocalUseCase);
  });

  it('hashes the password, creates the user as CUSTOMER, and issues tokens', async () => {
    bcryptService.encrypt.mockResolvedValue('hashed');
    createUserUseCase.execute.mockResolvedValue(user);
    issueTokensService.issue.mockResolvedValue(tokens);

    const result = await useCase.execute({
      name: 'New User',
      email: 'new@example.com',
      password: 'plain-password',
    });

    expect(bcryptService.encrypt).toHaveBeenCalledWith('plain-password');
    expect(createUserUseCase.execute).toHaveBeenCalledWith({
      name: 'New User',
      email: 'new@example.com',
      phone: undefined,
      passwordHash: 'hashed',
      role: UserRole.CUSTOMER,
    });
    expect(issueTokensService.issue).toHaveBeenCalledWith(user, {});
    expect(result).toEqual(tokens);
  });
});
