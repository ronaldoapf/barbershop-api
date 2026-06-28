import { ListPackagesUseCase } from './list-packages.use-case';
import { IPackagesRepository } from '../domain/packages.repository.interface';
import { PackageEntity } from '../domain/package.entity';
import { ItemStatus } from '../domain/item-status.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';

const mockRepo = (): jest.Mocked<IPackagesRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  softDelete: jest.fn(),
});

describe('ListPackagesUseCase', () => {
  it('returns paginated packages', async () => {
    const repo = mockRepo();
    const expected: PaginatedResult<PackageEntity> = {
      data: [{ id: '1', name: 'Full Package', status: ItemStatus.ACTIVE } as PackageEntity],
      total: 1,
      page: 1,
      limit: 10,
    };
    repo.findAll.mockResolvedValue(expected);
    const result = await new ListPackagesUseCase(repo).execute({ page: 1, limit: 10 });
    expect(repo.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result).toBe(expected);
  });
});
