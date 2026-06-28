import { NotFoundException } from '@nestjs/common';
import { UpdatePackageUseCase } from './update-package.use-case';
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

describe('UpdatePackageUseCase', () => {
  it('updates and returns package when found', async () => {
    const repo = mockRepo();
    const existing = { id: '1', name: 'Full Package', status: ItemStatus.ACTIVE } as PackageEntity;
    const updated = { id: '1', name: 'Premium Package', status: ItemStatus.ACTIVE } as PackageEntity;
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);
    const result = await new UpdatePackageUseCase(repo).execute('1', { name: 'Premium Package' });
    expect(repo.findById).toHaveBeenCalledWith('1');
    expect(repo.update).toHaveBeenCalledWith('1', { name: 'Premium Package' });
    expect(result).toBe(updated);
  });

  it('throws NotFoundException when package not found', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(null);
    await expect(new UpdatePackageUseCase(repo).execute('999', { name: 'X' })).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
