import { CreatePackageUseCase } from './create-package.use-case';
import { IPackagesRepository } from '../domain/packages.repository.interface';
import { PackageEntity } from '../domain/package.entity';
import { ItemStatus } from '../domain/item-status.enum';

const mockRepo = (): jest.Mocked<IPackagesRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  softDelete: jest.fn(),
});

describe('CreatePackageUseCase', () => {
  it('creates and returns package with all required fields', async () => {
    const repo = mockRepo();
    const expected = { id: '1', name: 'Full Package', price: 5000, order: 1, status: ItemStatus.ACTIVE, services: [] } as PackageEntity;
    repo.create.mockResolvedValue(expected);
    const dto = { name: 'Full Package', price: 5000, order: 1, serviceIds: ['svc-1', 'svc-2'] };
    const result = await new CreatePackageUseCase(repo).execute(dto);
    expect(repo.create).toHaveBeenCalledWith({
      name: 'Full Package',
      description: null,
      price: 5000,
      order: 1,
      pointsEarned: 0,
      pointsRequired: 0,
      serviceIds: ['svc-1', 'svc-2'],
    });
    expect(result).toBe(expected);
  });

  it('passes optional fields when provided', async () => {
    const repo = mockRepo();
    const expected = { id: '2', name: 'VIP Package' } as PackageEntity;
    repo.create.mockResolvedValue(expected);
    const dto = { name: 'VIP Package', price: 10000, order: 2, description: 'VIP treatment', pointsEarned: 100, pointsRequired: 50, serviceIds: ['svc-1'] };
    const result = await new CreatePackageUseCase(repo).execute(dto);
    expect(repo.create).toHaveBeenCalledWith({
      name: 'VIP Package',
      description: 'VIP treatment',
      price: 10000,
      order: 2,
      pointsEarned: 100,
      pointsRequired: 50,
      serviceIds: ['svc-1'],
    });
    expect(result).toBe(expected);
  });
});
