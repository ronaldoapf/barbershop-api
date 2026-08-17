import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeactivateServiceUseCase } from './deactivate-service.use-case';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ItemStatus } from '../domain/item-status.enum';
import { ServiceEntity } from '../domain/service.entity';

describe('DeactivateServiceUseCase', () => {
  let useCase: DeactivateServiceUseCase;

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
        DeactivateServiceUseCase,
        { provide: IServicesRepository, useValue: servicesRepository },
      ],
    }).compile();

    useCase = module.get(DeactivateServiceUseCase);
  });

  it('sets the service status to INACTIVE', async () => {
    servicesRepository.findById.mockResolvedValue(service);
    const deactivated = { ...service, status: ItemStatus.INACTIVE };
    servicesRepository.update.mockResolvedValue(deactivated);

    const result = await useCase.execute(service.id);

    expect(servicesRepository.update).toHaveBeenCalledWith(service.id, {
      status: ItemStatus.INACTIVE,
    });
    expect(result).toEqual(deactivated);
  });

  it('throws NotFoundException when the service does not exist', async () => {
    servicesRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(servicesRepository.update).not.toHaveBeenCalled();
  });
});
