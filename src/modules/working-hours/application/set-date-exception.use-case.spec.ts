import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SetDateExceptionUseCase } from './set-date-exception.use-case';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { WorkingHoursType } from '../domain/working-hours-type.enum';
import { IWorkingHoursRepository } from '../domain/working-hours.repository.interface';

describe('SetDateExceptionUseCase', () => {
  let useCase: SetDateExceptionUseCase;

  const workingHoursRepository = {
    listByBarber: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
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

  const barberUser: UserEntity = {
    id: 'user-1',
    name: 'Barber One',
    email: 'barber@example.com',
    phone: null,
    passwordHash: 'hash',
    role: UserRole.BARBER,
    loyaltyPoints: 0,
    avatarUrl: null,
    avatarStorageKey: null,
    createdAt: new Date(),
    disabledAt: null,
  };

  const existingException: BarberWorkingHoursEntity = {
    id: 'wh-exception-1',
    barberId: barber.id,
    type: WorkingHoursType.SPECIFIC_DATE,
    dayOfWeek: null,
    date: new Date('2026-12-25'),
    startTime: null,
    endTime: null,
    isWorking: false,
    createdAt: new Date(),
    disabledAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetDateExceptionUseCase,
        {
          provide: IWorkingHoursRepository,
          useValue: workingHoursRepository,
        },
        { provide: IBarbersRepository, useValue: barbersRepository },
      ],
    }).compile();

    useCase = module.get(SetDateExceptionUseCase);
  });

  it('creates a new SPECIFIC_DATE entry (day off) when none exists for the date', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);
    workingHoursRepository.listByBarber.mockResolvedValue([]);
    workingHoursRepository.create.mockResolvedValue(existingException);

    await useCase.execute(barberUser, barber.id, new Date('2026-12-25'), {
      isWorking: false,
    });

    expect(workingHoursRepository.create).toHaveBeenCalledWith({
      barberId: barber.id,
      type: WorkingHoursType.SPECIFIC_DATE,
      date: new Date('2026-12-25'),
      startTime: undefined,
      endTime: undefined,
      isWorking: false,
    });
  });

  it('updates the existing exception for the same calendar date instead of duplicating it', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);
    workingHoursRepository.listByBarber.mockResolvedValue([existingException]);
    workingHoursRepository.update.mockResolvedValue({
      ...existingException,
      isWorking: true,
      startTime: '10:00',
      endTime: '12:00',
    });

    await useCase.execute(barberUser, barber.id, new Date('2026-12-25'), {
      isWorking: true,
      startTime: '10:00',
      endTime: '12:00',
    });

    expect(workingHoursRepository.update).toHaveBeenCalledWith(
      existingException.id,
      { startTime: '10:00', endTime: '12:00', isWorking: true },
    );
    expect(workingHoursRepository.create).not.toHaveBeenCalled();
  });

  it('does not match an exception on a different date', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);
    workingHoursRepository.listByBarber.mockResolvedValue([existingException]);
    workingHoursRepository.create.mockResolvedValue(existingException);

    await useCase.execute(barberUser, barber.id, new Date('2026-12-26'), {
      isWorking: false,
    });

    expect(workingHoursRepository.create).toHaveBeenCalled();
    expect(workingHoursRepository.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when startTime is not before endTime', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);

    await expect(
      useCase.execute(barberUser, barber.id, new Date('2026-12-25'), {
        isWorking: true,
        startTime: '12:00',
        endTime: '10:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ForbiddenException when a BARBER targets another barber', async () => {
    barbersRepository.findByUserId.mockResolvedValue({
      ...barber,
      id: 'barber-2',
    });

    await expect(
      useCase.execute(barberUser, barber.id, new Date('2026-12-25'), {
        isWorking: false,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
