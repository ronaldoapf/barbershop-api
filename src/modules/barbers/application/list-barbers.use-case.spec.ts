import { Test, TestingModule } from '@nestjs/testing';
import { ListBarbersUseCase } from './list-barbers.use-case';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';

describe('ListBarbersUseCase', () => {
  let useCase: ListBarbersUseCase;

  const barbersRepository = {
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListBarbersUseCase,
        { provide: IBarbersRepository, useValue: barbersRepository },
      ],
    }).compile();

    useCase = module.get(ListBarbersUseCase);
  });

  it('returns the paginated list from the repository', async () => {
    const result = { data: [barber], total: 1, page: 1, limit: 20 };
    barbersRepository.list.mockResolvedValue(result);

    const output = await useCase.execute(1, 20);

    expect(barbersRepository.list).toHaveBeenCalledWith(1, 20);
    expect(output).toEqual(result);
  });
});
