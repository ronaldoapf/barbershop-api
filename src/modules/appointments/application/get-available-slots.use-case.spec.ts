import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetAvailableSlotsUseCase } from './get-available-slots.use-case';
import { IBarberServicesRepository } from '../../barber-services/domain/barber-services.repository.interface';
import { ItemStatus } from '../../services/domain/item-status.enum';
import { IServicesRepository } from '../../services/domain/services.repository.interface';
import { ServiceEntity } from '../../services/domain/service.entity';
import { GetAvailabilityWindowUseCase } from '../../working-hours/application/get-availability-window.use-case';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

describe('GetAvailableSlotsUseCase', () => {
  let useCase: GetAvailableSlotsUseCase;

  const appointmentsRepository = {
    createWithConflictCheck: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    listActiveInRange: jest.fn(),
    confirm: jest.fn(),
    markNoShow: jest.fn(),
    cancel: jest.fn(),
    complete: jest.fn(),
  };

  const servicesRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    softDelete: jest.fn(),
  };

  const barberServicesRepository = {
    assign: jest.fn(),
    unassign: jest.fn(),
    listByBarber: jest.fn(),
    listServiceIdsByBarber: jest.fn(),
  };

  const getAvailabilityWindowUseCase = { execute: jest.fn() };

  const haircut: ServiceEntity = {
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
        GetAvailableSlotsUseCase,
        { provide: IAppointmentsRepository, useValue: appointmentsRepository },
        { provide: IServicesRepository, useValue: servicesRepository },
        {
          provide: IBarberServicesRepository,
          useValue: barberServicesRepository,
        },
        {
          provide: GetAvailabilityWindowUseCase,
          useValue: getAvailabilityWindowUseCase,
        },
      ],
    }).compile();

    useCase = module.get(GetAvailableSlotsUseCase);

    barberServicesRepository.listServiceIdsByBarber.mockResolvedValue([
      haircut.id,
    ]);
    servicesRepository.findById.mockResolvedValue(haircut);
    appointmentsRepository.listActiveInRange.mockResolvedValue([]);
  });

  const input = {
    barberId: 'barber-1',
    serviceIds: [haircut.id],
    date: new Date('2026-08-17'),
  };

  it('throws BadRequestException when a requested service is not offered by the barber', async () => {
    barberServicesRepository.listServiceIdsByBarber.mockResolvedValue([]);

    await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when a requested service no longer exists', async () => {
    servicesRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('returns an empty array when the barber is not working that day', async () => {
    getAvailabilityWindowUseCase.execute.mockResolvedValue({
      isWorking: false,
      startTime: null,
      endTime: null,
    });

    const result = await useCase.execute(input);

    expect(result).toEqual([]);
    expect(appointmentsRepository.listActiveInRange).not.toHaveBeenCalled();
  });

  it('computes slots from the resolved window and busy appointments', async () => {
    getAvailabilityWindowUseCase.execute.mockResolvedValue({
      isWorking: true,
      startTime: '09:00',
      endTime: '10:00',
    });
    appointmentsRepository.listActiveInRange.mockResolvedValue([
      {
        startsAt: new Date('2026-08-17T09:00:00.000Z'),
        endsAt: new Date('2026-08-17T09:30:00.000Z'),
      },
    ]);

    const result = await useCase.execute(input);

    expect(result).toEqual([new Date('2026-08-17T09:30:00.000Z')]);
    expect(appointmentsRepository.listActiveInRange).toHaveBeenCalledWith(
      input.barberId,
      new Date('2026-08-17T00:00:00.000Z'),
      new Date('2026-08-17T23:59:59.000Z'),
    );
  });
});
