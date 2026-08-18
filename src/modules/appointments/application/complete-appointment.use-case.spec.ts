import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { CompleteAppointmentUseCase } from './complete-appointment.use-case';
import { GetSettingUseCase } from '../../settings/application/get-setting.use-case';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentSource } from '../domain/appointment-source.enum';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

describe('CompleteAppointmentUseCase', () => {
  let useCase: CompleteAppointmentUseCase;

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

  const getSettingUseCase = { execute: jest.fn() };
  const eventEmitter = { emit: jest.fn() };

  const appointment: AppointmentEntity = {
    id: 'appointment-1',
    customerId: 'customer-1',
    barberId: 'barber-1',
    startsAt: new Date(),
    endsAt: new Date(),
    totalAmount: 5000,
    status: AppointmentStatus.CONFIRMED,
    source: AppointmentSource.PLATFORM,
    cancellationReason: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: new Date(),
    disabledAt: null,
    services: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteAppointmentUseCase,
        { provide: IAppointmentsRepository, useValue: appointmentsRepository },
        { provide: GetSettingUseCase, useValue: getSettingUseCase },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    useCase = module.get(CompleteAppointmentUseCase);
    appointmentsRepository.findById.mockResolvedValue(appointment);
    getSettingUseCase.execute.mockResolvedValue(null);
    appointmentsRepository.complete.mockResolvedValue({
      ...appointment,
      status: AppointmentStatus.COMPLETED,
    });
  });

  it('throws NotFoundException when the appointment does not exist', async () => {
    appointmentsRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', [])).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ConflictException when the appointment is not CONFIRMED', async () => {
    appointmentsRepository.findById.mockResolvedValue({
      ...appointment,
      status: AppointmentStatus.PENDING,
    });

    await expect(useCase.execute(appointment.id, [])).rejects.toThrow(
      ConflictException,
    );
    expect(appointmentsRepository.complete).not.toHaveBeenCalled();
  });

  it('reads the commission_on_redeemed_service setting and passes it through as a boolean', async () => {
    getSettingUseCase.execute.mockResolvedValue('true');

    await useCase.execute(appointment.id, []);

    expect(getSettingUseCase.execute).toHaveBeenCalledWith(
      'commission_on_redeemed_service',
    );
    expect(appointmentsRepository.complete).toHaveBeenCalledWith(
      appointment.id,
      [],
      true,
    );
  });

  it('defaults commissionOnRedeemedService to false when the setting is absent', async () => {
    getSettingUseCase.execute.mockResolvedValue(null);

    await useCase.execute(appointment.id, []);

    expect(appointmentsRepository.complete).toHaveBeenCalledWith(
      appointment.id,
      [],
      false,
    );
  });

  it('emits appointment.completed after a successful completion', async () => {
    await useCase.execute(appointment.id, []);

    expect(eventEmitter.emit).toHaveBeenCalledWith('appointment.completed', {
      appointmentId: appointment.id,
    });
  });

  it('does not emit the event when completion fails', async () => {
    appointmentsRepository.complete.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute(appointment.id, [])).rejects.toThrow('boom');
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
