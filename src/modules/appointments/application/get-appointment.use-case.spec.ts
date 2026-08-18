import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetAppointmentUseCase } from './get-appointment.use-case';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentSource } from '../domain/appointment-source.enum';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

describe('GetAppointmentUseCase', () => {
  let useCase: GetAppointmentUseCase;

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

  const barber: BarberEntity = {
    id: 'barber-1',
    userId: 'barber-user-1',
    name: 'Barber One',
    avatarUrl: null,
    commissionPercentage: 30,
    createdAt: new Date(),
    disabledAt: null,
  };

  const appointment: AppointmentEntity = {
    id: 'appointment-1',
    customerId: 'customer-1',
    barberId: barber.id,
    startsAt: new Date(),
    endsAt: new Date(),
    totalAmount: 5000,
    status: AppointmentStatus.PENDING,
    source: AppointmentSource.PLATFORM,
    cancellationReason: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: new Date(),
    disabledAt: null,
    services: [],
  };

  const baseUser: UserEntity = {
    id: 'user-x',
    name: 'User',
    email: 'user@example.com',
    phone: null,
    passwordHash: 'hash',
    role: UserRole.CUSTOMER,
    loyaltyPoints: 0,
    avatarUrl: null,
    avatarStorageKey: null,
    createdAt: new Date(),
    disabledAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAppointmentUseCase,
        { provide: IAppointmentsRepository, useValue: appointmentsRepository },
        { provide: IBarbersRepository, useValue: barbersRepository },
      ],
    }).compile();

    useCase = module.get(GetAppointmentUseCase);
    appointmentsRepository.findById.mockResolvedValue(appointment);
  });

  it('throws NotFoundException when the appointment does not exist', async () => {
    appointmentsRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ ...baseUser, role: UserRole.OWNER }, 'missing'),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows OWNER to view any appointment', async () => {
    const result = await useCase.execute(
      { ...baseUser, role: UserRole.OWNER },
      appointment.id,
    );
    expect(result).toBe(appointment);
  });

  it('allows the owning CUSTOMER to view their appointment', async () => {
    const customer = {
      ...baseUser,
      id: appointment.customerId,
      role: UserRole.CUSTOMER,
    };
    const result = await useCase.execute(customer, appointment.id);
    expect(result).toBe(appointment);
  });

  it('throws NotFoundException (not Forbidden) for a different CUSTOMER, to avoid leaking existence', async () => {
    const otherCustomer = {
      ...baseUser,
      id: 'someone-else',
      role: UserRole.CUSTOMER,
    };

    await expect(
      useCase.execute(otherCustomer, appointment.id),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows the owning BARBER to view the appointment', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);
    const barberUser = {
      ...baseUser,
      id: barber.userId,
      role: UserRole.BARBER,
    };

    const result = await useCase.execute(barberUser, appointment.id);
    expect(result).toBe(appointment);
  });

  it('throws NotFoundException for a different BARBER', async () => {
    barbersRepository.findByUserId.mockResolvedValue({
      ...barber,
      id: 'barber-2',
    });
    const barberUser = {
      ...baseUser,
      id: 'other-barber-user',
      role: UserRole.BARBER,
    };

    await expect(useCase.execute(barberUser, appointment.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException for a BARBER with no Barber record', async () => {
    barbersRepository.findByUserId.mockResolvedValue(null);
    const barberUser = {
      ...baseUser,
      id: 'no-barber-user',
      role: UserRole.BARBER,
    };

    await expect(useCase.execute(barberUser, appointment.id)).rejects.toThrow(
      NotFoundException,
    );
  });
});
