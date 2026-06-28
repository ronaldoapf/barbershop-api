import { NotFoundException } from '@nestjs/common';
import { GetBarberUseCase } from './get-barber.use-case';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';

describe('GetBarberUseCase', () => {
  let useCase: GetBarberUseCase;
  let repo: jest.Mocked<IBarbersRepository>;

  beforeEach(() => {
    repo = { findById: jest.fn() } as unknown as jest.Mocked<IBarbersRepository>;
    useCase = new GetBarberUseCase(repo);
  });

  it('throws NotFoundException when barber not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
  });

  it('returns barber when found', async () => {
    const barber = { id: 'barber-1' } as BarberEntity;
    repo.findById.mockResolvedValue(barber);
    await expect(useCase.execute('barber-1')).resolves.toBe(barber);
  });
});
