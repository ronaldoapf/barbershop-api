import { Test, TestingModule } from '@nestjs/testing';
import { CreateServiceUseCase } from './create-service.use-case';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ItemStatus } from '../domain/item-status.enum';
import { ServiceEntity } from '../domain/service.entity';

describe('CreateServiceUseCase', () => {
  let useCase: CreateServiceUseCase;

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
        CreateServiceUseCase,
        { provide: IServicesRepository, useValue: servicesRepository },
      ],
    }).compile();

    useCase = module.get(CreateServiceUseCase);
  });

  it('creates a service via the repository', async () => {
    servicesRepository.create.mockResolvedValue(service);

    const data = {
      name: 'Haircut',
      price: 5000,
      durationMinutes: 30,
      order: 1,
      pointsEarned: 10,
    };

    const result = await useCase.execute(data);

    expect(servicesRepository.create).toHaveBeenCalledWith(data);
    expect(result).toEqual(service);
  });

  it('forwards optional barberIds to the repository unchanged', async () => {
    servicesRepository.create.mockResolvedValue(service);

    const data = {
      name: 'Haircut',
      price: 5000,
      durationMinutes: 30,
      order: 1,
      barberIds: ['barber-1', 'barber-2'],
    };

    await useCase.execute(data);

    expect(servicesRepository.create).toHaveBeenCalledWith(data);
  });
});
