import { NotFoundException } from '@nestjs/common';
import { DeletePackageUseCase } from './delete-package.use-case';
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

describe('DeletePackageUseCase', () => {
  it('soft deletes package when found', async () => {
    const repo = mockRepo();
    const existing = { id: '1', name: 'Full Package', status: ItemStatus.ACTIVE } as PackageEntity;
    repo.findById.mockResolvedValue(existing);
    repo.softDelete.mockResolvedValue(undefined);
    await new DeletePackageUseCase(repo).execute('1');
    expect(repo.findById).toHaveBeenCalledWith('1');
    expect(repo.softDelete).toHaveBeenCalledWith('1');
  });

  it('throws NotFoundException when package not found', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(null);
    await expect(new DeletePackageUseCase(repo).execute('999')).rejects.toThrow(NotFoundException);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });
});
