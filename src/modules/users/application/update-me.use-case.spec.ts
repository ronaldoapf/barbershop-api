import { NotFoundException } from '@nestjs/common';
import { UpdateMeUseCase } from './update-me.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UpdateMeDto } from '../dto/update-me.dto';

describe('UpdateMeUseCase', () => {
  let useCase: UpdateMeUseCase;
  let repo: jest.Mocked<IUsersRepository>;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IUsersRepository>;
    useCase = new UpdateMeUseCase(repo);
  });

  it('throws NotFoundException when user not found', async () => {
    repo.findById.mockResolvedValue(null);
    const dto: UpdateMeDto = { name: 'New Name' };
    await expect(useCase.execute('missing', dto)).rejects.toThrow(NotFoundException);
  });

  it('returns updated user when successful', async () => {
    const user = { id: 'user-1' } as UserEntity;
    const updatedUser = { id: 'user-1', name: 'New Name' } as UserEntity;
    const dto: UpdateMeDto = { name: 'New Name' };

    repo.findById.mockResolvedValue(user);
    repo.update.mockResolvedValue(updatedUser);

    const result = await useCase.execute('user-1', dto);

    expect(repo.update).toHaveBeenCalledWith('user-1', dto);
    expect(result).toBe(updatedUser);
  });

  it('accepts partial updates', async () => {
    const user = { id: 'user-1' } as UserEntity;
    const updatedUser = { id: 'user-1', phone: '123456' } as UserEntity;
    const dto: UpdateMeDto = { phone: '123456' };

    repo.findById.mockResolvedValue(user);
    repo.update.mockResolvedValue(updatedUser);

    const result = await useCase.execute('user-1', dto);

    expect(repo.update).toHaveBeenCalledWith('user-1', dto);
    expect(result).toBe(updatedUser);
  });
});
