import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ListWorkingHoursUseCase } from './list-working-hours.use-case';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { IWorkingHoursRepository } from '../domain/working-hours.repository.interface';

describe('ListWorkingHoursUseCase', () => {
  let useCase: ListWorkingHoursUseCase;

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

  const customer: UserEntity = {
    ...owner,
    id: 'customer-1',
    role: UserRole.CUSTOMER,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListWorkingHoursUseCase,
        {
          provide: IWorkingHoursRepository,
          useValue: workingHoursRepository,
        },
        { provide: IBarbersRepository, useValue: barbersRepository },
      ],
    }).compile();

    useCase = module.get(ListWorkingHoursUseCase);
  });

  it('allows OWNER to list any barber’s hours', async () => {
    workingHoursRepository.listByBarber.mockResolvedValue([]);

    await useCase.execute(owner, barber.id);

    expect(barbersRepository.findByUserId).not.toHaveBeenCalled();
    expect(workingHoursRepository.listByBarber).toHaveBeenCalledWith(barber.id);
  });

  it('throws ForbiddenException for a non-owner with no matching Barber record', async () => {
    barbersRepository.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute(customer, barber.id)).rejects.toThrow(
      ForbiddenException,
    );
    expect(workingHoursRepository.listByBarber).not.toHaveBeenCalled();
  });

  it('allows a BARBER to list their own hours', async () => {
    const barberUser = {
      ...customer,
      id: barber.userId,
      role: UserRole.BARBER,
    };
    barbersRepository.findByUserId.mockResolvedValue(barber);
    workingHoursRepository.listByBarber.mockResolvedValue([]);

    await useCase.execute(barberUser, barber.id);

    expect(workingHoursRepository.listByBarber).toHaveBeenCalledWith(barber.id);
  });
});
