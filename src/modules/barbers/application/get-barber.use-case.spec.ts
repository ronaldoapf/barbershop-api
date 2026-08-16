import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetBarberUseCase } from './get-barber.use-case';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';

describe('GetBarberUseCase', () => {
  let useCase: GetBarberUseCase;

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
        GetBarberUseCase,
        { provide: IBarbersRepository, useValue: barbersRepository },
      ],
    }).compile();

    useCase = module.get(GetBarberUseCase);
  });

  it('returns the barber when found', async () => {
    barbersRepository.findById.mockResolvedValue(barber);

    const result = await useCase.execute(barber.id);

    expect(barbersRepository.findById).toHaveBeenCalledWith(barber.id);
    expect(result).toEqual(barber);
  });

  it('throws NotFoundException when the barber does not exist', async () => {
    barbersRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
