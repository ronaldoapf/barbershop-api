import { ListBarbersUseCase } from './list-barbers.use-case';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';

describe('ListBarbersUseCase', () => {
  let useCase: ListBarbersUseCase;
  let repo: jest.Mocked<IBarbersRepository>;

  beforeEach(() => {
    repo = { findAll: jest.fn() } as unknown as jest.Mocked<IBarbersRepository>;
    useCase = new ListBarbersUseCase(repo);
  });

  it('returns paginated barbers from repository', async () => {
    const barbers: BarberEntity[] = [
      { id: 'barber-1' } as BarberEntity,
      { id: 'barber-2' } as BarberEntity,
    ];
    const result: PaginatedResult<BarberEntity> = {
      data: barbers,
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

  it('passes pagination params to repository', async () => {
    const result: PaginatedResult<BarberEntity> = {
      data: [],
      total: 0,
      page: 2,
      limit: 20,
    };

    repo.findAll.mockResolvedValue(result);

    const params = { page: 2, limit: 20 };
    await useCase.execute(params);

    expect(repo.findAll).toHaveBeenCalledWith(params);
  });
});
