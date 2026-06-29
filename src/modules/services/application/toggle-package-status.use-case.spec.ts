import { NotFoundException } from '@nestjs/common';
import { TogglePackageStatusUseCase } from './toggle-package-status.use-case';
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

describe('TogglePackageStatusUseCase', () => {
  it('toggles ACTIVE package to INACTIVE', async () => {
    const repo = mockRepo();
    const pkg = { id: '1', name: 'Full Package', status: ItemStatus.ACTIVE } as PackageEntity;
    const updated = { ...pkg, status: ItemStatus.INACTIVE } as PackageEntity;
    repo.findById.mockResolvedValue(pkg);
    repo.updateStatus.mockResolvedValue(updated);
    const result = await new TogglePackageStatusUseCase(repo).execute('1');
    expect(repo.updateStatus).toHaveBeenCalledWith('1', ItemStatus.INACTIVE);
    expect(result).toBe(updated);
  });

  it('toggles INACTIVE package to ACTIVE', async () => {
    const repo = mockRepo();
    const pkg = { id: '1', name: 'Full Package', status: ItemStatus.INACTIVE } as PackageEntity;
    const updated = { ...pkg, status: ItemStatus.ACTIVE } as PackageEntity;
    repo.findById.mockResolvedValue(pkg);
    repo.updateStatus.mockResolvedValue(updated);
    const result = await new TogglePackageStatusUseCase(repo).execute('1');
    expect(repo.updateStatus).toHaveBeenCalledWith('1', ItemStatus.ACTIVE);
    expect(result).toBe(updated);
  });

  it('throws NotFoundException when package not found', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(null);
    await expect(new TogglePackageStatusUseCase(repo).execute('999')).rejects.toThrow(NotFoundException);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});
