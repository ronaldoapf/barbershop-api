import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateUserProfileUseCase } from './update-user-profile.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

describe('UpdateUserProfileUseCase', () => {
  let useCase: UpdateUserProfileUseCase;

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
        UpdateUserProfileUseCase,
        { provide: IUsersRepository, useValue: usersRepository },
      ],
    }).compile();

    useCase = module.get(UpdateUserProfileUseCase);
  });

  it('updates and returns the user when it exists', async () => {
    const updated = { ...user, name: 'Updated Name' };
    usersRepository.findById.mockResolvedValue(user);
    usersRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(user.id, { name: 'Updated Name' });

    expect(usersRepository.update).toHaveBeenCalledWith(user.id, {
      name: 'Updated Name',
    });
    expect(result).toEqual(updated);
  });

  it('throws NotFoundException when the user does not exist', async () => {
    usersRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing-id', { name: 'Updated Name' }),
    ).rejects.toThrow(NotFoundException);
    expect(usersRepository.update).not.toHaveBeenCalled();
  });
});
