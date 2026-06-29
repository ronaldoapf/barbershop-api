import { NotFoundException } from '@nestjs/common';
import { UpdateServiceUseCase } from './update-service.use-case';
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

describe('UpdateServiceUseCase', () => {
  it('updates and returns service when found', async () => {
    const repo = mockRepo();
    const existing = { id: '1', name: 'Haircut', status: ItemStatus.ACTIVE } as ServiceEntity;
    const updated = { id: '1', name: 'New Haircut', status: ItemStatus.ACTIVE } as ServiceEntity;
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);
    const result = await new UpdateServiceUseCase(repo).execute('1', { name: 'New Haircut' });
    expect(repo.findById).toHaveBeenCalledWith('1');
    expect(repo.update).toHaveBeenCalledWith('1', { name: 'New Haircut' });
    expect(result).toBe(updated);
  });

  it('throws NotFoundException when service not found', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(null);
    await expect(new UpdateServiceUseCase(repo).execute('999', { name: 'X' })).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
