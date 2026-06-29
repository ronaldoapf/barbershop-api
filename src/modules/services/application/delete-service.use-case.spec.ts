import { NotFoundException } from '@nestjs/common';
import { DeleteServiceUseCase } from './delete-service.use-case';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';
import { ItemStatus } from '../domain/item-status.enum';

const mockRepo = (): jest.Mocked<IServicesRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  softDelete: jest.fn(),
});

describe('DeleteServiceUseCase', () => {
  it('soft deletes service when found', async () => {
    const repo = mockRepo();
    const existing = { id: '1', name: 'Haircut', status: ItemStatus.ACTIVE } as ServiceEntity;
    repo.findById.mockResolvedValue(existing);
    repo.softDelete.mockResolvedValue(undefined);
    await new DeleteServiceUseCase(repo).execute('1');
    expect(repo.findById).toHaveBeenCalledWith('1');
    expect(repo.softDelete).toHaveBeenCalledWith('1');
  });

  it('throws NotFoundException when service not found', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(null);
    await expect(new DeleteServiceUseCase(repo).execute('999')).rejects.toThrow(NotFoundException);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });
});
