import { CreateServiceUseCase } from './create-service.use-case';
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

describe('CreateServiceUseCase', () => {
  it('creates and returns service with all required fields', async () => {
    const repo = mockRepo();
    const expected = { id: '1', name: 'Haircut', price: 2000, durationMinutes: 30, order: 1, status: ItemStatus.ACTIVE } as ServiceEntity;
    repo.create.mockResolvedValue(expected);
    const dto = { name: 'Haircut', price: 2000, durationMinutes: 30, order: 1 };
    const result = await new CreateServiceUseCase(repo).execute(dto);
    expect(repo.create).toHaveBeenCalledWith({
      categoryId: null,
      name: 'Haircut',
      description: null,
      price: 2000,
      durationMinutes: 30,
      order: 1,
      pointsEarned: 0,
      pointsRequired: 0,
    });
    expect(result).toBe(expected);
  });

  it('passes optional fields when provided', async () => {
    const repo = mockRepo();
    const expected = { id: '2', name: 'Trim', categoryId: 'cat-1' } as ServiceEntity;
    repo.create.mockResolvedValue(expected);
    const dto = { name: 'Trim', price: 1500, durationMinutes: 20, order: 2, categoryId: 'cat-1', description: 'Quick trim', pointsEarned: 10, pointsRequired: 5 };
    const result = await new CreateServiceUseCase(repo).execute(dto);
    expect(repo.create).toHaveBeenCalledWith({
      categoryId: 'cat-1',
      name: 'Trim',
      description: 'Quick trim',
      price: 1500,
      durationMinutes: 20,
      order: 2,
      pointsEarned: 10,
      pointsRequired: 5,
    });
    expect(result).toBe(expected);
  });
});
