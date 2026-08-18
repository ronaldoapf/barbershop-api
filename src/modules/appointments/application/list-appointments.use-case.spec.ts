import { Test, TestingModule } from '@nestjs/testing';
import { ListAppointmentsUseCase } from './list-appointments.use-case';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

describe('ListAppointmentsUseCase', () => {
  let useCase: ListAppointmentsUseCase;

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

  const paginatedResult = { data: [], total: 0, page: 1, limit: 20 };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAppointmentsUseCase,
        { provide: IAppointmentsRepository, useValue: appointmentsRepository },
        { provide: IBarbersRepository, useValue: barbersRepository },
      ],
    }).compile();

    useCase = module.get(ListAppointmentsUseCase);
    appointmentsRepository.list.mockResolvedValue(paginatedResult);
  });

  it('scopes CUSTOMER requests by their own customerId', async () => {
    const customer = { ...baseUser, id: 'customer-1', role: UserRole.CUSTOMER };

    await useCase.execute(customer, 1, 20);

    expect(appointmentsRepository.list).toHaveBeenCalledWith(
      { customerId: 'customer-1', status: undefined },
      1,
      20,
    );
  });

  it('scopes BARBER requests by their resolved Barber.id', async () => {
    barbersRepository.findByUserId.mockResolvedValue(barber);
    const barberUser = {
      ...baseUser,
      id: barber.userId,
      role: UserRole.BARBER,
    };

    await useCase.execute(barberUser, 1, 20);

    expect(appointmentsRepository.list).toHaveBeenCalledWith(
      { barberId: barber.id, status: undefined },
      1,
      20,
    );
  });

  it('returns an empty page for a BARBER with no Barber record, without querying the repository', async () => {
    barbersRepository.findByUserId.mockResolvedValue(null);
    const barberUser = { ...baseUser, id: 'no-barber', role: UserRole.BARBER };

    const result = await useCase.execute(barberUser, 1, 20);

    expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    expect(appointmentsRepository.list).not.toHaveBeenCalled();
  });

  it('applies no scoping filter for OWNER', async () => {
    const owner = { ...baseUser, id: 'owner-1', role: UserRole.OWNER };

    await useCase.execute(owner, 1, 20);

    expect(appointmentsRepository.list).toHaveBeenCalledWith(
      { status: undefined },
      1,
      20,
    );
  });
});
