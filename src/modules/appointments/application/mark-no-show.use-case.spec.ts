import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MarkNoShowUseCase } from './mark-no-show.use-case';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentSource } from '../domain/appointment-source.enum';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

describe('MarkNoShowUseCase', () => {
  let useCase: MarkNoShowUseCase;

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
        MarkNoShowUseCase,
        { provide: IAppointmentsRepository, useValue: appointmentsRepository },
      ],
    }).compile();

    useCase = module.get(MarkNoShowUseCase);
  });

  it.each([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])(
    'marks a %s appointment as NO_SHOW',
    async (status) => {
      appointmentsRepository.findById.mockResolvedValue({
        ...appointment,
        status,
      });
      appointmentsRepository.markNoShow.mockResolvedValue({
        ...appointment,
        status: AppointmentStatus.NO_SHOW,
      });

      await useCase.execute(appointment.id);

      expect(appointmentsRepository.markNoShow).toHaveBeenCalledWith(
        appointment.id,
      );
    },
  );

  it('throws NotFoundException when the appointment does not exist', async () => {
    appointmentsRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException for a COMPLETED appointment', async () => {
    appointmentsRepository.findById.mockResolvedValue({
      ...appointment,
      status: AppointmentStatus.COMPLETED,
    });

    await expect(useCase.execute(appointment.id)).rejects.toThrow(
      ConflictException,
    );
  });
});
