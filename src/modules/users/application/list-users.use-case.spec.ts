import { ListUsersUseCase } from './list-users.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let repo: jest.Mocked<IUsersRepository>;

  beforeEach(() => {
    repo = { findAll: jest.fn() } as unknown as jest.Mocked<IUsersRepository>;
    useCase = new ListUsersUseCase(repo);
  });

  it('returns paginated users from repository', async () => {
    const users: UserEntity[] = [
      { id: 'user-1' } as UserEntity,
      { id: 'user-2' } as UserEntity,
    ];
    const result: PaginatedResult<UserEntity> = {
      data: users,
      total: 2,
      page: 1,
      limit: 10,
    };

    repo.findAll.mockResolvedValue(result);

    const params = { page: 1, limit: 10 };
    const actual = await useCase.execute(params);

    expect(repo.findAll).toHaveBeenCalledWith(params);
    expect(actual).toBe(result);
  });

  it('passes role filter when provided', async () => {
    const result: PaginatedResult<UserEntity> = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    };

    repo.findAll.mockResolvedValue(result);

    const params = { role: UserRole.BARBER, page: 1, limit: 10 };
    await useCase.execute(params);

    expect(repo.findAll).toHaveBeenCalledWith(params);
  });
});
