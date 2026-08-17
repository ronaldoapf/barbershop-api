import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateServiceUseCase } from './update-service.use-case';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ItemStatus } from '../domain/item-status.enum';
import { ServiceEntity } from '../domain/service.entity';

describe('UpdateServiceUseCase', () => {
  let useCase: UpdateServiceUseCase;

  const servicesRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    softDelete: jest.fn(),
  };

  const service: ServiceEntity = {
    id: 'service-1',
    name: 'Haircut',
    description: null,
    price: 5000,
    durationMinutes: 30,
    status: ItemStatus.ACTIVE,
    order: 1,
    pointsEarned: 10,
    pointsRequired: 0,
    createdAt: new Date(),
    disabledAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateServiceUseCase,
        { provide: IServicesRepository, useValue: servicesRepository },
      ],
    }).compile();

    useCase = module.get(UpdateServiceUseCase);
  });

  it('updates the service when it exists', async () => {
    servicesRepository.findById.mockResolvedValue(service);
    const updated = { ...service, price: 6000 };
    servicesRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(service.id, { price: 6000 });

    expect(servicesRepository.update).toHaveBeenCalledWith(service.id, {
      price: 6000,
    });
    expect(result).toEqual(updated);
  });

  it('throws NotFoundException when the service does not exist', async () => {
    servicesRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing-id', { price: 6000 }),
    ).rejects.toThrow(NotFoundException);
    expect(servicesRepository.update).not.toHaveBeenCalled();
  });
});
