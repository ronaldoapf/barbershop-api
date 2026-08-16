import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateCommissionUseCase } from './update-commission.use-case';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';

describe('UpdateCommissionUseCase', () => {
  let useCase: UpdateCommissionUseCase;

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
        UpdateCommissionUseCase,
        { provide: IBarbersRepository, useValue: barbersRepository },
      ],
    }).compile();

    useCase = module.get(UpdateCommissionUseCase);
  });

  it('updates the commission when the barber exists', async () => {
    barbersRepository.findById.mockResolvedValue(barber);
    const updated = { ...barber, commissionPercentage: 40 };
    barbersRepository.updateCommission.mockResolvedValue(updated);

    const result = await useCase.execute(barber.id, 40);

    expect(barbersRepository.findById).toHaveBeenCalledWith(barber.id);
    expect(barbersRepository.updateCommission).toHaveBeenCalledWith(
      barber.id,
      40,
    );
    expect(result).toEqual(updated);
  });

  it('throws NotFoundException when the barber does not exist', async () => {
    barbersRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-id', 40)).rejects.toThrow(
      NotFoundException,
    );
    expect(barbersRepository.updateCommission).not.toHaveBeenCalled();
  });
});
