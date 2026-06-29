import { ListServicesUseCase } from './list-services.use-case';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';
import { ItemStatus } from '../domain/item-status.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';

const mockRepo = (): jest.Mocked<IServicesRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  softDelete: jest.fn(),
});

describe('ListServicesUseCase', () => {
  it('returns paginated services', async () => {
    const repo = mockRepo();
    const expected: PaginatedResult<ServiceEntity> = {
      data: [{ id: '1', name: 'Haircut', status: ItemStatus.ACTIVE } as ServiceEntity],
      total: 1,
      page: 1,
      limit: 10,
    };
    repo.findAll.mockResolvedValue(expected);
    const result = await new ListServicesUseCase(repo).execute({ page: 1, limit: 10 });
    expect(repo.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result).toBe(expected);
  });

  it('passes filter params to repository', async () => {
    const repo = mockRepo();
    const expected: PaginatedResult<ServiceEntity> = { data: [], total: 0, page: 1, limit: 10 };
    repo.findAll.mockResolvedValue(expected);
    await new ListServicesUseCase(repo).execute({ categoryId: 'cat-1', status: ItemStatus.ACTIVE, page: 1, limit: 10 });
    expect(repo.findAll).toHaveBeenCalledWith({ categoryId: 'cat-1', status: ItemStatus.ACTIVE, page: 1, limit: 10 });
  });
});
