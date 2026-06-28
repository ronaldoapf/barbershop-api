import { NotFoundException } from '@nestjs/common';
import { UpdateBarberUseCase } from './update-barber.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';
import { UpdateBarberDto } from '../dto/update-barber.dto';

describe('UpdateBarberUseCase', () => {
  let useCase: UpdateBarberUseCase;
  let usersRepo: jest.Mocked<IUsersRepository>;
  let barbersRepo: jest.Mocked<IBarbersRepository>;

  beforeEach(() => {
    usersRepo = {
      update: jest.fn(),
    } as unknown as jest.Mocked<IUsersRepository>;
    barbersRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<IBarbersRepository>;
    useCase = new UpdateBarberUseCase(usersRepo, barbersRepo);
  });

  it('throws NotFoundException when barber not found', async () => {
    barbersRepo.findById.mockResolvedValue(null);
    const dto: UpdateBarberDto = { name: 'New Name' };
    await expect(useCase.execute('missing', dto)).rejects.toThrow(NotFoundException);
  });

  it('updates user fields when name or phone is provided', async () => {
    const barber = { id: 'barber-1', userId: 'user-1' } as BarberEntity;
    const updatedBarber = { id: 'barber-1', userId: 'user-1', commissionPercentage: 15 } as BarberEntity;
    const dto: UpdateBarberDto = { name: 'New Name', phone: '987654321' };

    barbersRepo.findById.mockResolvedValueOnce(barber);
    barbersRepo.findById.mockResolvedValueOnce(updatedBarber);

    await useCase.execute('barber-1', dto);

    expect(usersRepo.update).toHaveBeenCalledWith('user-1', { name: 'New Name', phone: '987654321' });
  });

  it('updates commission when commissionPercentage is provided', async () => {
    const barber = { id: 'barber-1', userId: 'user-1', commissionPercentage: 10 } as BarberEntity;
    const updatedBarber = { id: 'barber-1', userId: 'user-1', commissionPercentage: 20 } as BarberEntity;
    const dto: UpdateBarberDto = { commissionPercentage: 20 };

    barbersRepo.findById.mockResolvedValue(barber);
    barbersRepo.update.mockResolvedValue(updatedBarber);

    const result = await useCase.execute('barber-1', dto);

    expect(barbersRepo.update).toHaveBeenCalledWith('barber-1', { commissionPercentage: 20 });
    expect(result).toBe(updatedBarber);
  });

  it('updates both user and barber fields when provided', async () => {
    const barber = { id: 'barber-1', userId: 'user-1', commissionPercentage: 10 } as BarberEntity;
    const updatedBarber = { id: 'barber-1', userId: 'user-1', commissionPercentage: 20 } as BarberEntity;
    const dto: UpdateBarberDto = { name: 'New Name', phone: '987654321', commissionPercentage: 20 };

    barbersRepo.findById.mockResolvedValue(barber);
    barbersRepo.update.mockResolvedValue(updatedBarber);

    const result = await useCase.execute('barber-1', dto);

    expect(usersRepo.update).toHaveBeenCalledWith('user-1', { name: 'New Name', phone: '987654321' });
    expect(barbersRepo.update).toHaveBeenCalledWith('barber-1', { commissionPercentage: 20 });
    expect(result).toBe(updatedBarber);
  });

  it('refetches barber when only user fields are updated', async () => {
    const barber = { id: 'barber-1', userId: 'user-1', commissionPercentage: 10 } as BarberEntity;
    const updatedBarber = { id: 'barber-1', userId: 'user-1', name: 'New Name' } as unknown as BarberEntity;
    const dto: UpdateBarberDto = { name: 'New Name' };

    barbersRepo.findById.mockResolvedValueOnce(barber);
    barbersRepo.findById.mockResolvedValueOnce(updatedBarber);

    const result = await useCase.execute('barber-1', dto);

    expect(usersRepo.update).toHaveBeenCalledWith('user-1', { name: 'New Name', phone: undefined });
    expect(barbersRepo.findById).toHaveBeenCalledTimes(2);
    expect(result).toBe(updatedBarber);
  });
});
