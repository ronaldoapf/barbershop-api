import { NotFoundException } from '@nestjs/common';
import { GetMeUseCase } from './get-me.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';

describe('GetMeUseCase', () => {
  let useCase: GetMeUseCase;
  let repo: jest.Mocked<IUsersRepository>;

  beforeEach(() => {
    repo = { findById: jest.fn() } as unknown as jest.Mocked<IUsersRepository>;
    useCase = new GetMeUseCase(repo);
  });

  it('throws NotFoundException when user not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
  });

  it('returns user when found', async () => {
    const user = { id: 'user-1' } as UserEntity;
    repo.findById.mockResolvedValue(user);
    await expect(useCase.execute('user-1')).resolves.toBe(user);
  });
});
