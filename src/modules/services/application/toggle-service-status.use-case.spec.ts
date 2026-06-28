import { NotFoundException } from '@nestjs/common';
import { ToggleServiceStatusUseCase } from './toggle-service-status.use-case';
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

describe('ToggleServiceStatusUseCase', () => {
  it('toggles ACTIVE service to INACTIVE', async () => {
    const repo = mockRepo();
    const service = { id: '1', name: 'Haircut', status: ItemStatus.ACTIVE } as ServiceEntity;
    const updated = { ...service, status: ItemStatus.INACTIVE } as ServiceEntity;
    repo.findById.mockResolvedValue(service);
    repo.updateStatus.mockResolvedValue(updated);
    const result = await new ToggleServiceStatusUseCase(repo).execute('1');
    expect(repo.updateStatus).toHaveBeenCalledWith('1', ItemStatus.INACTIVE);
    expect(result).toBe(updated);
  });

  it('toggles INACTIVE service to ACTIVE', async () => {
    const repo = mockRepo();
    const service = { id: '1', name: 'Haircut', status: ItemStatus.INACTIVE } as ServiceEntity;
    const updated = { ...service, status: ItemStatus.ACTIVE } as ServiceEntity;
    repo.findById.mockResolvedValue(service);
    repo.updateStatus.mockResolvedValue(updated);
    const result = await new ToggleServiceStatusUseCase(repo).execute('1');
    expect(repo.updateStatus).toHaveBeenCalledWith('1', ItemStatus.ACTIVE);
    expect(result).toBe(updated);
  });

  it('throws NotFoundException when service not found', async () => {
    const repo = mockRepo();
    repo.findById.mockResolvedValue(null);
    await expect(new ToggleServiceStatusUseCase(repo).execute('999')).rejects.toThrow(NotFoundException);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});
