import { NotFoundException } from '@nestjs/common';
import { ConfirmAvatarUseCase } from './confirm-avatar.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

describe('ConfirmAvatarUseCase', () => {
  let useCase: ConfirmAvatarUseCase;
  let usersRepository: jest.Mocked<IUsersRepository>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    usersRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IUsersRepository>;
    storageService = {
      deleteObject: jest.fn(),
      getPublicUrl: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;
    useCase = new ConfirmAvatarUseCase(usersRepository, storageService);
  });

  it('throws NotFoundException when user not found', async () => {
    usersRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-user', 'avatars/test.jpg')).rejects.toThrow(
      new NotFoundException('Usuário não encontrado'),
    );
  });

  it('updates user with new avatarUrl and avatarStorageKey', async () => {
    const user: UserEntity = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      phone: null,
      passwordHash: null,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 0,
      avatarUrl: null,
      avatarStorageKey: null,
      createdAt: new Date(),
      disabledAt: null,
    };

    const updatedUser: UserEntity = {
      ...user,
      avatarUrl: 'https://example.com/avatars/test.jpg',
      avatarStorageKey: 'avatars/user-1/test.jpg',
    };

    usersRepository.findById.mockResolvedValue(user);
    usersRepository.update.mockResolvedValue(updatedUser);
    storageService.getPublicUrl.mockReturnValue('https://example.com/avatars/test.jpg');

    const result = await useCase.execute('user-1', 'avatars/user-1/test.jpg');

    expect(result).toEqual(updatedUser);
  });

  it('calls storage service to get public url', async () => {
    const user: UserEntity = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      phone: null,
      passwordHash: null,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 0,
      avatarUrl: null,
      avatarStorageKey: null,
      createdAt: new Date(),
      disabledAt: null,
    };

    const updatedUser: UserEntity = {
      ...user,
      avatarUrl: 'https://example.com/avatars/test.jpg',
      avatarStorageKey: 'avatars/user-1/test.jpg',
    };

    usersRepository.findById.mockResolvedValue(user);
    usersRepository.update.mockResolvedValue(updatedUser);
    storageService.getPublicUrl.mockReturnValue('https://example.com/avatars/test.jpg');

    await useCase.execute('user-1', 'avatars/user-1/test.jpg');

    expect(storageService.getPublicUrl).toHaveBeenCalledWith('avatars/user-1/test.jpg');
  });

  it('deletes old avatarStorageKey when it exists', async () => {
    const user: UserEntity = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      phone: null,
      passwordHash: null,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 0,
      avatarUrl: 'https://example.com/old-avatar.jpg',
      avatarStorageKey: 'avatars/user-1/old.jpg',
      createdAt: new Date(),
      disabledAt: null,
    };

    const updatedUser: UserEntity = {
      ...user,
      avatarUrl: 'https://example.com/avatars/new.jpg',
      avatarStorageKey: 'avatars/user-1/new.jpg',
    };

    usersRepository.findById.mockResolvedValue(user);
    usersRepository.update.mockResolvedValue(updatedUser);
    storageService.getPublicUrl.mockReturnValue('https://example.com/avatars/new.jpg');
    storageService.deleteObject.mockResolvedValue(undefined);

    await useCase.execute('user-1', 'avatars/user-1/new.jpg');

    expect(storageService.deleteObject).toHaveBeenCalledWith('avatars/user-1/old.jpg');
  });

  it('does not delete when old avatarStorageKey is null', async () => {
    const user: UserEntity = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      phone: null,
      passwordHash: null,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 0,
      avatarUrl: null,
      avatarStorageKey: null,
      createdAt: new Date(),
      disabledAt: null,
    };

    const updatedUser: UserEntity = {
      ...user,
      avatarUrl: 'https://example.com/avatars/test.jpg',
      avatarStorageKey: 'avatars/user-1/test.jpg',
    };

    usersRepository.findById.mockResolvedValue(user);
    usersRepository.update.mockResolvedValue(updatedUser);
    storageService.getPublicUrl.mockReturnValue('https://example.com/avatars/test.jpg');

    await useCase.execute('user-1', 'avatars/user-1/test.jpg');

    expect(storageService.deleteObject).not.toHaveBeenCalled();
  });

  it('continues updating even if deleteObject fails', async () => {
    const user: UserEntity = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      phone: null,
      passwordHash: null,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 0,
      avatarUrl: 'https://example.com/old-avatar.jpg',
      avatarStorageKey: 'avatars/user-1/old.jpg',
      createdAt: new Date(),
      disabledAt: null,
    };

    const updatedUser: UserEntity = {
      ...user,
      avatarUrl: 'https://example.com/avatars/new.jpg',
      avatarStorageKey: 'avatars/user-1/new.jpg',
    };

    usersRepository.findById.mockResolvedValue(user);
    usersRepository.update.mockResolvedValue(updatedUser);
    storageService.getPublicUrl.mockReturnValue('https://example.com/avatars/new.jpg');
    storageService.deleteObject.mockRejectedValue(new Error('Delete failed'));

    const result = await useCase.execute('user-1', 'avatars/user-1/new.jpg');

    expect(result).toEqual(updatedUser);
    expect(usersRepository.update).toHaveBeenCalled();
  });

  it('updates repository with correct userId and data', async () => {
    const user: UserEntity = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      phone: null,
      passwordHash: null,
      role: UserRole.CUSTOMER,
      loyaltyPoints: 0,
      avatarUrl: null,
      avatarStorageKey: null,
      createdAt: new Date(),
      disabledAt: null,
    };

    const newStorageKey = 'avatars/user-1/new.jpg';
    const newPublicUrl = 'https://example.com/avatars/new.jpg';

    const updatedUser: UserEntity = {
      ...user,
      avatarUrl: newPublicUrl,
      avatarStorageKey: newStorageKey,
    };

    usersRepository.findById.mockResolvedValue(user);
    usersRepository.update.mockResolvedValue(updatedUser);
    storageService.getPublicUrl.mockReturnValue(newPublicUrl);

    await useCase.execute('user-1', newStorageKey);

    expect(usersRepository.update).toHaveBeenCalledWith('user-1', {
      avatarUrl: newPublicUrl,
      avatarStorageKey: newStorageKey,
    });
  });
});
