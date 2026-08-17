import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ListBarberServicesUseCase } from './list-barber-services.use-case';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { ItemStatus } from '../../services/domain/item-status.enum';
import { ServiceEntity } from '../../services/domain/service.entity';
import { IBarberServicesRepository } from '../domain/barber-services.repository.interface';

describe('ListBarberServicesUseCase', () => {
  let useCase: ListBarberServicesUseCase;

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

  const barber: BarberEntity = {
    id: 'barber-1',
    userId: 'user-1',
    name: 'Barber One',
    avatarUrl: null,
    commissionPercentage: 30,
    createdAt: new Date(),
    disabledAt: null,
  };

  const services: ServiceEntity[] = [
    {
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
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListBarberServicesUseCase,
        {
          provide: IBarberServicesRepository,
          useValue: barberServicesRepository,
        },
        { provide: IBarbersRepository, useValue: barbersRepository },
      ],
    }).compile();

    useCase = module.get(ListBarberServicesUseCase);
  });

  it('returns the services assigned to the barber', async () => {
    barbersRepository.findById.mockResolvedValue(barber);
    barberServicesRepository.listByBarber.mockResolvedValue(services);

    const result = await useCase.execute(barber.id);

    expect(barberServicesRepository.listByBarber).toHaveBeenCalledWith(
      barber.id,
    );
    expect(result).toEqual(services);
  });

  it('throws NotFoundException when the barber does not exist', async () => {
    barbersRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-barber')).rejects.toThrow(
      NotFoundException,
    );
    expect(barberServicesRepository.listByBarber).not.toHaveBeenCalled();
  });
});
