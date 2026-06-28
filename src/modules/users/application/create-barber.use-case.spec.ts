import { ConflictException } from '@nestjs/common';
import { CreateBarberUseCase } from './create-barber.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';
import { UserEntity } from '../domain/user.entity';
import { BarberEntity } from '../domain/barber.entity';
import { CreateBarberDto } from '../dto/create-barber.dto';
import { UserRole } from '../domain/user-role.enum';

describe('CreateBarberUseCase', () => {
  let useCase: CreateBarberUseCase;
  let usersRepo: jest.Mocked<IUsersRepository>;
  let barbersRepo: jest.Mocked<IBarbersRepository>;
  let bcryptService: jest.Mocked<BcryptService>;

  beforeEach(() => {
    usersRepo = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<IUsersRepository>;
    barbersRepo = {
      create: jest.fn(),
    } as unknown as jest.Mocked<IBarbersRepository>;
    bcryptService = { encrypt: jest.fn().mockResolvedValue('hashed'), compare: jest.fn() } as unknown as jest.Mocked<BcryptService>;
    useCase = new CreateBarberUseCase(usersRepo, barbersRepo, bcryptService);
  });

  it('throws ConflictException when email already exists', async () => {
    const dto: CreateBarberDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      phone: '123456789',
      commissionPercentage: 15,
    };
    usersRepo.findByEmail.mockResolvedValue({ id: 'existing' } as UserEntity);

    await expect(useCase.execute(dto)).rejects.toThrow(ConflictException);
    expect(usersRepo.create).not.toHaveBeenCalled();
  });

  it('creates user and barber when email is available', async () => {
    const dto: CreateBarberDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      phone: '123456789',
      commissionPercentage: 15,
    };
    const user = { id: 'user-1', role: UserRole.BARBER } as UserEntity;
    const barber = { id: 'barber-1', userId: 'user-1', commissionPercentage: 15 } as BarberEntity;

    usersRepo.findByEmail.mockResolvedValue(null);
    usersRepo.create.mockResolvedValue(user);
    barbersRepo.create.mockResolvedValue(barber);

    const result = await useCase.execute(dto);

    expect(usersRepo.findByEmail).toHaveBeenCalledWith(dto.email);
    expect(usersRepo.create).toHaveBeenCalledWith({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash: expect.any(String),
      role: UserRole.BARBER,
    });
    expect(barbersRepo.create).toHaveBeenCalledWith({
      userId: 'user-1',
      commissionPercentage: dto.commissionPercentage,
    });
    expect(result).toBe(barber);
  });

  it('hashes password before creating user', async () => {
    const dto: CreateBarberDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      phone: '123456789',
      commissionPercentage: 15,
    };
    const user = { id: 'user-1' } as UserEntity;
    const barber = { id: 'barber-1', userId: 'user-1' } as BarberEntity;

    usersRepo.findByEmail.mockResolvedValue(null);
    usersRepo.create.mockResolvedValue(user);
    barbersRepo.create.mockResolvedValue(barber);

    await useCase.execute(dto);

    expect(bcryptService.encrypt).toHaveBeenCalledWith(dto.password);
    const createCall = usersRepo.create.mock.calls[0][0];
    expect(createCall.passwordHash).not.toBe(dto.password);
  });
});
