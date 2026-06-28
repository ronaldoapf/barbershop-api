import { NotFoundException } from '@nestjs/common';
import { DeleteBarberUseCase } from './delete-barber.use-case';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';

describe('DeleteBarberUseCase', () => {
  let useCase: DeleteBarberUseCase;
  let repo: jest.Mocked<IBarbersRepository>;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<IBarbersRepository>;
    useCase = new DeleteBarberUseCase(repo);
  });

  it('throws NotFoundException when barber not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('soft deletes barber when found', async () => {
    const barber = { id: 'barber-1' } as BarberEntity;
    repo.findById.mockResolvedValue(barber);
    repo.softDelete.mockResolvedValue(undefined);

    await useCase.execute('barber-1');

    expect(repo.findById).toHaveBeenCalledWith('barber-1');
    expect(repo.softDelete).toHaveBeenCalledWith('barber-1');
  });
});
