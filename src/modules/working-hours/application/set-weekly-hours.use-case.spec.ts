import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SetWeeklyHoursUseCase } from './set-weekly-hours.use-case';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { WorkingHoursType } from '../domain/working-hours-type.enum';
import { IWorkingHoursRepository } from '../domain/working-hours.repository.interface';

describe('SetWeeklyHoursUseCase', () => {
  let useCase: SetWeeklyHoursUseCase;

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

  const owner: UserEntity = {
    id: 'owner-1',
    name: 'Owner',
    email: 'owner@example.com',
    phone: null,
    passwordHash: 'hash',
    role: UserRole.OWNER,
    loyaltyPoints: 0,
    avatarUrl: null,
    avatarStorageKey: null,
    createdAt: new Date(),
    disabledAt: null,
  };

  const barberUser: UserEntity = {
    ...owner,
    id: 'user-1',
    role: UserRole.BARBER,
  };

  const otherBarberUser: UserEntity = {
    ...owner,
    id: 'user-2',
    role: UserRole.BARBER,
  };

  const existingEntry: BarberWorkingHoursEntity = {
    id: 'wh-1',
    barberId: barber.id,
    type: WorkingHoursType.WEEKLY,
    dayOfWeek: 1,
    date: null,
    startTime: '08:00',
    endTime: '17:00',
    isWorking: true,
    createdAt: new Date(),
    disabledAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetWeeklyHoursUseCase,
        {
          provide: IWorkingHoursRepository,
          useValue: workingHoursRepository,
        },
        { provide: IBarbersRepository, useValue: barbersRepository },
      ],
    }).compile();

    useCase = module.get(SetWeeklyHoursUseCase);
  });

  it('creates a new WEEKLY entry when none exists for the day', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);
    workingHoursRepository.listByBarber.mockResolvedValue([]);
    workingHoursRepository.create.mockResolvedValue(existingEntry);

    await useCase.execute(barberUser, barber.id, 1, {
      isWorking: true,
      startTime: '08:00',
      endTime: '17:00',
    });

    expect(workingHoursRepository.create).toHaveBeenCalledWith({
      barberId: barber.id,
      type: WorkingHoursType.WEEKLY,
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '17:00',
      isWorking: true,
    });
    expect(workingHoursRepository.update).not.toHaveBeenCalled();
  });

  it('updates the existing WEEKLY entry for the day instead of creating a duplicate', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);
    workingHoursRepository.listByBarber.mockResolvedValue([existingEntry]);
    workingHoursRepository.update.mockResolvedValue({
      ...existingEntry,
      startTime: '09:00',
    });

    await useCase.execute(barberUser, barber.id, 1, {
      isWorking: true,
      startTime: '09:00',
      endTime: '17:00',
    });

    expect(workingHoursRepository.update).toHaveBeenCalledWith(
      existingEntry.id,
      { startTime: '09:00', endTime: '17:00', isWorking: true },
    );
    expect(workingHoursRepository.create).not.toHaveBeenCalled();
  });

  it('clears startTime/endTime when isWorking is false', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);
    workingHoursRepository.listByBarber.mockResolvedValue([existingEntry]);
    workingHoursRepository.update.mockResolvedValue({
      ...existingEntry,
      isWorking: false,
      startTime: null,
      endTime: null,
    });

    await useCase.execute(barberUser, barber.id, 1, { isWorking: false });

    expect(workingHoursRepository.update).toHaveBeenCalledWith(
      existingEntry.id,
      { startTime: null, endTime: null, isWorking: false },
    );
  });

  it('throws BadRequestException when startTime is not before endTime', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);

    await expect(
      useCase.execute(barberUser, barber.id, 1, {
        isWorking: true,
        startTime: '18:00',
        endTime: '09:00',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(workingHoursRepository.listByBarber).not.toHaveBeenCalled();
  });

  it('allows OWNER to manage any barber’s hours', async () => {
    workingHoursRepository.listByBarber.mockResolvedValue([]);
    workingHoursRepository.create.mockResolvedValue(existingEntry);

    await useCase.execute(owner, barber.id, 1, {
      isWorking: true,
      startTime: '08:00',
      endTime: '17:00',
    });

    expect(barbersRepository.findByUserId).not.toHaveBeenCalled();
    expect(workingHoursRepository.create).toHaveBeenCalled();
  });

  it('throws ForbiddenException when a BARBER tries to manage another barber’s hours', async () => {
    barbersRepository.findByUserId.mockResolvedValue({
      ...barber,
      id: 'barber-2',
      userId: otherBarberUser.id,
    });

    await expect(
      useCase.execute(otherBarberUser, barber.id, 1, {
        isWorking: true,
        startTime: '08:00',
        endTime: '17:00',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(workingHoursRepository.listByBarber).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the requester has no Barber record at all', async () => {
    barbersRepository.findByUserId.mockResolvedValue(null);

    await expect(
      useCase.execute(otherBarberUser, barber.id, 1, {
        isWorking: true,
        startTime: '08:00',
        endTime: '17:00',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
