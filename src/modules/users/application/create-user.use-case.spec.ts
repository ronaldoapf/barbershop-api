import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserUseCase } from './create-user.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;

  const usersRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const existingUser: UserEntity = {
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        { provide: IUsersRepository, useValue: usersRepository },
      ],
    }).compile();

    useCase = module.get(CreateUserUseCase);
  });

  it('creates a user when the email is not already taken', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockResolvedValue(existingUser);

    const result = await useCase.execute({
      name: 'New User',
      email: 'new@example.com',
    });

    expect(usersRepository.findByEmail).toHaveBeenCalledWith('new@example.com');
    expect(usersRepository.create).toHaveBeenCalledWith({
      name: 'New User',
      email: 'new@example.com',
    });
    expect(result).toEqual(existingUser);
  });

  it('throws ConflictException when the email is already taken', async () => {
    usersRepository.findByEmail.mockResolvedValue(existingUser);

    await expect(
      useCase.execute({ name: 'New User', email: existingUser.email }),
    ).rejects.toThrow(ConflictException);
    expect(usersRepository.create).not.toHaveBeenCalled();
  });
});
