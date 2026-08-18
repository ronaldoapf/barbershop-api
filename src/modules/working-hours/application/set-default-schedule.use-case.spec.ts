import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SetDefaultScheduleUseCase } from './set-default-schedule.use-case';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { WorkingHoursType } from '../domain/working-hours-type.enum';
import {
  CreateWorkingHoursData,
  IWorkingHoursRepository,
} from '../domain/working-hours.repository.interface';

describe('SetDefaultScheduleUseCase', () => {
  let useCase: SetDefaultScheduleUseCase;

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

  const buildEntry = (
    dayOfWeek: number,
    overrides: Partial<BarberWorkingHoursEntity> = {},
  ): BarberWorkingHoursEntity => ({
    id: `wh-${dayOfWeek}`,
    barberId: barber.id,
    type: WorkingHoursType.WEEKLY,
    dayOfWeek,
    date: null,
    startTime: '09:00',
    endTime: '18:00',
    isWorking: true,
    createdAt: new Date(),
    disabledAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetDefaultScheduleUseCase,
        {
          provide: IWorkingHoursRepository,
          useValue: workingHoursRepository,
        },
        { provide: IBarbersRepository, useValue: barbersRepository },
      ],
    }).compile();

    useCase = module.get(SetDefaultScheduleUseCase);
  });

  it('creates WEEKLY entries for Monday-Friday as working and the weekend as off, when workingDays is omitted', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);
    workingHoursRepository.listByBarber.mockResolvedValue([]);
    workingHoursRepository.create.mockImplementation(
      (data: CreateWorkingHoursData) =>
        Promise.resolve(buildEntry(data.dayOfWeek as number, data)),
    );

    await useCase.execute(barberUser, barber.id, {
      startTime: '09:00',
      endTime: '18:00',
    });

    expect(workingHoursRepository.create).toHaveBeenCalledTimes(7);
    expect(workingHoursRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dayOfWeek: 0,
        isWorking: false,
        startTime: undefined,
        endTime: undefined,
      }),
    );
    expect(workingHoursRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dayOfWeek: 1,
        isWorking: true,
        startTime: '09:00',
        endTime: '18:00',
      }),
    );
    expect(workingHoursRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dayOfWeek: 6,
        isWorking: false,
        startTime: undefined,
        endTime: undefined,
      }),
    );
  });

  it('updates existing entries instead of duplicating them', async () => {
    const monday = buildEntry(1, { startTime: '08:00', endTime: '12:00' });
    barbersRepository.findByUserId.mockResolvedValue(barber);
    workingHoursRepository.listByBarber.mockResolvedValue([monday]);
    workingHoursRepository.update.mockResolvedValue({
      ...monday,
      startTime: '09:00',
      endTime: '18:00',
    });
    workingHoursRepository.create.mockImplementation(
      (data: CreateWorkingHoursData) =>
        Promise.resolve(buildEntry(data.dayOfWeek as number, data)),
    );

    await useCase.execute(barberUser, barber.id, {
      startTime: '09:00',
      endTime: '18:00',
    });

    expect(workingHoursRepository.update).toHaveBeenCalledWith(monday.id, {
      startTime: '09:00',
      endTime: '18:00',
      isWorking: true,
    });
    expect(workingHoursRepository.create).toHaveBeenCalledTimes(6);
  });

  it('respects a custom workingDays list', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);
    workingHoursRepository.listByBarber.mockResolvedValue([]);
    workingHoursRepository.create.mockImplementation(
      (data: CreateWorkingHoursData) =>
        Promise.resolve(buildEntry(data.dayOfWeek as number, data)),
    );

    await useCase.execute(barberUser, barber.id, {
      startTime: '10:00',
      endTime: '16:00',
      workingDays: [2, 4, 6],
    });

    expect(workingHoursRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ dayOfWeek: 2, isWorking: true }),
    );
    expect(workingHoursRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ dayOfWeek: 1, isWorking: false }),
    );
  });

  it('throws BadRequestException when startTime is not before endTime', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);

    await expect(
      useCase.execute(barberUser, barber.id, {
        startTime: '18:00',
        endTime: '09:00',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(workingHoursRepository.listByBarber).not.toHaveBeenCalled();
  });

  it('allows OWNER to set up any barber’s default schedule', async () => {
    workingHoursRepository.listByBarber.mockResolvedValue([]);
    workingHoursRepository.create.mockImplementation(
      (data: CreateWorkingHoursData) =>
        Promise.resolve(buildEntry(data.dayOfWeek as number, data)),
    );

    await useCase.execute(owner, barber.id, {
      startTime: '09:00',
      endTime: '18:00',
    });

    expect(barbersRepository.findByUserId).not.toHaveBeenCalled();
    expect(workingHoursRepository.create).toHaveBeenCalledTimes(7);
  });

  it('throws ForbiddenException when a BARBER tries to set up another barber’s schedule', async () => {
    barbersRepository.findByUserId.mockResolvedValue({
      ...barber,
      id: 'barber-2',
      userId: otherBarberUser.id,
    });

    await expect(
      useCase.execute(otherBarberUser, barber.id, {
        startTime: '09:00',
        endTime: '18:00',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(workingHoursRepository.listByBarber).not.toHaveBeenCalled();
  });
});
