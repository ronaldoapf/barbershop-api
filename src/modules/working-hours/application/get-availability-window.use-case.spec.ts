import { Test, TestingModule } from '@nestjs/testing';
import { GetAvailabilityWindowUseCase } from './get-availability-window.use-case';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { WorkingHoursType } from '../domain/working-hours-type.enum';
import { IWorkingHoursRepository } from '../domain/working-hours.repository.interface';

describe('GetAvailabilityWindowUseCase', () => {
  let useCase: GetAvailabilityWindowUseCase;

  const workingHoursRepository = {
    listByBarber: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const barberId = 'barber-1';

  const weekly = (
    dayOfWeek: number,
    overrides: Partial<BarberWorkingHoursEntity> = {},
  ): BarberWorkingHoursEntity => ({
    id: `weekly-${dayOfWeek}`,
    barberId,
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

  const exception = (
    date: string,
    overrides: Partial<BarberWorkingHoursEntity> = {},
  ): BarberWorkingHoursEntity => ({
    id: `exception-${date}`,
    barberId,
    type: WorkingHoursType.SPECIFIC_DATE,
    dayOfWeek: null,
    date: new Date(date),
    startTime: '10:00',
    endTime: '14:00',
    isWorking: true,
    createdAt: new Date(),
    disabledAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAvailabilityWindowUseCase,
        {
          provide: IWorkingHoursRepository,
          useValue: workingHoursRepository,
        },
      ],
    }).compile();

    useCase = module.get(GetAvailabilityWindowUseCase);
  });

  it('falls back to not-working when no schedule is configured', async () => {
    workingHoursRepository.listByBarber.mockResolvedValue([]);

    const result = await useCase.execute(barberId, new Date('2026-08-17'));

    expect(result).toEqual({
      isWorking: false,
      startTime: null,
      endTime: null,
    });
  });

  it('resolves the WEEKLY entry matching the date’s day of week', async () => {
    // 2026-08-17 is a Monday (dayOfWeek 1)
    workingHoursRepository.listByBarber.mockResolvedValue([
      weekly(1, { startTime: '08:00', endTime: '17:00' }),
      weekly(2),
    ]);

    const result = await useCase.execute(barberId, new Date('2026-08-17'));

    expect(result).toEqual({
      isWorking: true,
      startTime: '08:00',
      endTime: '17:00',
    });
  });

  it('a SPECIFIC_DATE exception takes priority over a matching WEEKLY entry', async () => {
    workingHoursRepository.listByBarber.mockResolvedValue([
      weekly(1, { startTime: '08:00', endTime: '17:00' }),
      exception('2026-08-17', { startTime: '10:00', endTime: '12:00' }),
    ]);

    const result = await useCase.execute(barberId, new Date('2026-08-17'));

    expect(result).toEqual({
      isWorking: true,
      startTime: '10:00',
      endTime: '12:00',
    });
  });

  it('a SPECIFIC_DATE day-off exception overrides a WEEKLY entry that would otherwise be working', async () => {
    workingHoursRepository.listByBarber.mockResolvedValue([
      weekly(1, { startTime: '08:00', endTime: '17:00' }),
      exception('2026-08-17', {
        isWorking: false,
        startTime: null,
        endTime: null,
      }),
    ]);

    const result = await useCase.execute(barberId, new Date('2026-08-17'));

    expect(result).toEqual({
      isWorking: false,
      startTime: null,
      endTime: null,
    });
  });

  it('ignores an exception for a different date', async () => {
    workingHoursRepository.listByBarber.mockResolvedValue([
      weekly(1, { startTime: '08:00', endTime: '17:00' }),
      exception('2026-08-18'),
    ]);

    const result = await useCase.execute(barberId, new Date('2026-08-17'));

    expect(result).toEqual({
      isWorking: true,
      startTime: '08:00',
      endTime: '17:00',
    });
  });

  it('resolves Sunday (dayOfWeek 0) correctly at the week boundary', async () => {
    // 2026-08-16 is a Sunday
    workingHoursRepository.listByBarber.mockResolvedValue([
      weekly(0, { startTime: '10:00', endTime: '14:00' }),
      weekly(6, { startTime: '08:00', endTime: '20:00' }),
    ]);

    const result = await useCase.execute(barberId, new Date('2026-08-16'));

    expect(result).toEqual({
      isWorking: true,
      startTime: '10:00',
      endTime: '14:00',
    });
  });

  it('resolves Saturday (dayOfWeek 6) correctly at the week boundary', async () => {
    // 2026-08-22 is a Saturday
    workingHoursRepository.listByBarber.mockResolvedValue([
      weekly(0, { startTime: '10:00', endTime: '14:00' }),
      weekly(6, { startTime: '08:00', endTime: '20:00' }),
    ]);

    const result = await useCase.execute(barberId, new Date('2026-08-22'));

    expect(result).toEqual({
      isWorking: true,
      startTime: '08:00',
      endTime: '20:00',
    });
  });

  it('treats a WEEKLY day-off entry as not working', async () => {
    workingHoursRepository.listByBarber.mockResolvedValue([
      weekly(1, { isWorking: false, startTime: null, endTime: null }),
    ]);

    const result = await useCase.execute(barberId, new Date('2026-08-17'));

    expect(result).toEqual({
      isWorking: false,
      startTime: null,
      endTime: null,
    });
  });
});
