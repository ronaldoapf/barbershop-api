import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetUserProfileUseCase } from './get-user-profile.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

describe('GetUserProfileUseCase', () => {
  let useCase: GetUserProfileUseCase;

  const usersRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserProfileUseCase,
        { provide: IUsersRepository, useValue: usersRepository },
      ],
    }).compile();

    useCase = module.get(GetUserProfileUseCase);
  });

  it('returns the user when found', async () => {
    usersRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute(user.id);

    expect(usersRepository.findById).toHaveBeenCalledWith(user.id);
    expect(result).toEqual(user);
  });

  it('throws NotFoundException when the user does not exist', async () => {
    usersRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
