import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateAppointmentUseCase } from './create-appointment.use-case';
import { IBarberServicesRepository } from '../../barber-services/domain/barber-services.repository.interface';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { ItemStatus } from '../../services/domain/item-status.enum';
import { IServicesRepository } from '../../services/domain/services.repository.interface';
import { ServiceEntity } from '../../services/domain/service.entity';
import { GetAvailabilityWindowUseCase } from '../../working-hours/application/get-availability-window.use-case';
import { AppointmentSource } from '../domain/appointment-source.enum';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

describe('CreateAppointmentUseCase', () => {
  let useCase: CreateAppointmentUseCase;

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

  const barberServicesRepository = {
    assign: jest.fn(),
    unassign: jest.fn(),
    listByBarber: jest.fn(),
    listServiceIdsByBarber: jest.fn(),
  };

  const getAvailabilityWindowUseCase = { execute: jest.fn() };

  const barber: BarberEntity = {
    id: 'barber-1',
    userId: 'user-1',
    name: 'Barber One',
    avatarUrl: null,
    commissionPercentage: 30,
    createdAt: new Date(),
    disabledAt: null,
  };

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

  const createdAppointment = { id: 'appointment-1' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAppointmentUseCase,
        { provide: IAppointmentsRepository, useValue: appointmentsRepository },
        { provide: IBarbersRepository, useValue: barbersRepository },
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

    useCase = module.get(CreateAppointmentUseCase);

    barbersRepository.findById.mockResolvedValue(barber);
    barberServicesRepository.listServiceIdsByBarber.mockResolvedValue([
      haircut.id,
    ]);
    servicesRepository.findById.mockResolvedValue(haircut);
    getAvailabilityWindowUseCase.execute.mockResolvedValue({
      isWorking: true,
      startTime: '09:00',
      endTime: '18:00',
    });
    appointmentsRepository.createWithConflictCheck.mockResolvedValue(
      createdAppointment,
    );
  });

  const validInput = {
    barberId: barber.id,
    serviceIds: [haircut.id],
    startsAt: new Date('2026-08-17T10:00:00.000Z'),
  };

  it('creates the appointment with the summed price/duration snapshot', async () => {
    const result = await useCase.execute('customer-1', validInput);

    expect(appointmentsRepository.createWithConflictCheck).toHaveBeenCalledWith(
      {
        customerId: 'customer-1',
        barberId: barber.id,
        startsAt: validInput.startsAt,
        endsAt: new Date('2026-08-17T10:30:00.000Z'),
        totalAmount: 5000,
        source: AppointmentSource.PLATFORM,
        services: [
          {
            serviceId: haircut.id,
            serviceName: haircut.name,
            price: haircut.price,
            durationMinutes: haircut.durationMinutes,
            pointsEarned: haircut.pointsEarned,
          },
        ],
      },
    );
    expect(result).toBe(createdAppointment);
  });

  it('throws NotFoundException when the barber does not exist', async () => {
    barbersRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('customer-1', validInput)).rejects.toThrow(
      NotFoundException,
    );
    expect(
      appointmentsRepository.createWithConflictCheck,
    ).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the barber does not offer a requested service (decision #7a)', async () => {
    barberServicesRepository.listServiceIdsByBarber.mockResolvedValue([]);

    await expect(useCase.execute('customer-1', validInput)).rejects.toThrow(
      BadRequestException,
    );
    expect(
      appointmentsRepository.createWithConflictCheck,
    ).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when a requested service no longer exists', async () => {
    servicesRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('customer-1', validInput)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when a requested service is INACTIVE', async () => {
    servicesRepository.findById.mockResolvedValue({
      ...haircut,
      status: ItemStatus.INACTIVE,
    });

    await expect(useCase.execute('customer-1', validInput)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws ConflictException when the barber is not working at the requested time', async () => {
    getAvailabilityWindowUseCase.execute.mockResolvedValue({
      isWorking: false,
      startTime: null,
      endTime: null,
    });

    await expect(useCase.execute('customer-1', validInput)).rejects.toThrow(
      ConflictException,
    );
    expect(
      appointmentsRepository.createWithConflictCheck,
    ).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the requested window extends past the working window end', async () => {
    getAvailabilityWindowUseCase.execute.mockResolvedValue({
      isWorking: true,
      startTime: '09:00',
      endTime: '10:15',
    });

    await expect(useCase.execute('customer-1', validInput)).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws ConflictException when the requested start is before the working window start', async () => {
    getAvailabilityWindowUseCase.execute.mockResolvedValue({
      isWorking: true,
      startTime: '10:30',
      endTime: '18:00',
    });

    await expect(useCase.execute('customer-1', validInput)).rejects.toThrow(
      ConflictException,
    );
  });
});
