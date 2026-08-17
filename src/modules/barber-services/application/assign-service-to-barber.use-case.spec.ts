import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AssignServiceToBarberUseCase } from './assign-service-to-barber.use-case';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { IServicesRepository } from '../../services/domain/services.repository.interface';
import { ItemStatus } from '../../services/domain/item-status.enum';
import { ServiceEntity } from '../../services/domain/service.entity';
import { IBarberServicesRepository } from '../domain/barber-services.repository.interface';

describe('AssignServiceToBarberUseCase', () => {
  let useCase: AssignServiceToBarberUseCase;

  const barberServicesRepository = {
    assign: jest.fn(),
    unassign: jest.fn(),
    listByBarber: jest.fn(),
    listServiceIdsByBarber: jest.fn(),
  };

  const barbersRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    list: jest.fn(),
    updateCommission: jest.fn(),
  };

  const servicesRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    softDelete: jest.fn(),
  };

  const barber: BarberEntity = {
    id: 'barber-1',
    userId: 'user-1',
    name: 'Barber One',
    avatarUrl: null,
    commissionPercentage: 30,
    createdAt: new Date(),
    disabledAt: null,
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
        AssignServiceToBarberUseCase,
        {
          provide: IBarberServicesRepository,
          useValue: barberServicesRepository,
        },
        { provide: IBarbersRepository, useValue: barbersRepository },
        { provide: IServicesRepository, useValue: servicesRepository },
      ],
    }).compile();

    useCase = module.get(AssignServiceToBarberUseCase);
  });

  it('assigns the service to the barber when both exist', async () => {
    barbersRepository.findById.mockResolvedValue(barber);
    servicesRepository.findById.mockResolvedValue(service);
    barberServicesRepository.assign.mockResolvedValue({
      id: 'bs-1',
      barberId: barber.id,
      serviceId: service.id,
      createdAt: new Date(),
    });

    const result = await useCase.execute(barber.id, service.id);

    expect(barberServicesRepository.assign).toHaveBeenCalledWith(
      barber.id,
      service.id,
    );
    expect(result).toEqual(service);
  });

  it('throws NotFoundException when the barber does not exist', async () => {
    barbersRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-barber', service.id)).rejects.toThrow(
      NotFoundException,
    );
    expect(barberServicesRepository.assign).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the service does not exist', async () => {
    barbersRepository.findById.mockResolvedValue(barber);
    servicesRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(barber.id, 'missing-service')).rejects.toThrow(
      NotFoundException,
    );
    expect(barberServicesRepository.assign).not.toHaveBeenCalled();
  });
});
