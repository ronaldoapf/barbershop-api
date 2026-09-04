import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FindOrCreateCustomerByPhoneUseCase } from './find-or-create-customer-by-phone.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

describe('FindOrCreateCustomerByPhoneUseCase', () => {
  let useCase: FindOrCreateCustomerByPhoneUseCase;

  const usersRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const existingCustomer: UserEntity = {
    id: 'user-1',
    name: 'Existing Customer',
    email: null,
    phone: '+5511999999999',
    passwordHash: null,
    role: UserRole.CUSTOMER,
    loyaltyPoints: 0,
    avatarUrl: null,
    avatarStorageKey: null,
    createdAt: new Date(),
    disabledAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindOrCreateCustomerByPhoneUseCase,
        { provide: IUsersRepository, useValue: usersRepository },
      ],
    }).compile();

    useCase = module.get(FindOrCreateCustomerByPhoneUseCase);
  });

  it('returns the existing customer when the phone is already known', async () => {
    usersRepository.findByPhone.mockResolvedValue(existingCustomer);

    const result = await useCase.execute({ phone: existingCustomer.phone! });

    expect(result).toBe(existingCustomer);
    expect(usersRepository.create).not.toHaveBeenCalled();
  });

  it('creates a new CUSTOMER on first interaction with a default name', async () => {
    usersRepository.findByPhone.mockResolvedValue(null);
    usersRepository.create.mockResolvedValue(existingCustomer);

    const result = await useCase.execute({ phone: '+5511999999999' });

    expect(usersRepository.create).toHaveBeenCalledWith({
      name: 'Cliente WhatsApp',
      phone: '+5511999999999',
      role: UserRole.CUSTOMER,
    });
    expect(result).toBe(existingCustomer);
  });

  it('uses the provided name when given', async () => {
    usersRepository.findByPhone.mockResolvedValue(null);
    usersRepository.create.mockResolvedValue(existingCustomer);

    await useCase.execute({ phone: '+5511999999999', name: 'João' });

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'João' }),
    );
  });

  it('recovers by re-fetching on a concurrent duplicate-phone race', async () => {
    usersRepository.findByPhone
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingCustomer);
    usersRepository.create.mockRejectedValue(
      new ConflictException('Já existe um usuário com este telefone.'),
    );

    const result = await useCase.execute({ phone: existingCustomer.phone! });

    expect(result).toBe(existingCustomer);
    expect(usersRepository.findByPhone).toHaveBeenCalledTimes(2);
  });

  it('rethrows the conflict if it cannot recover by phone', async () => {
    usersRepository.findByPhone.mockResolvedValue(null);
    usersRepository.create.mockRejectedValue(
      new ConflictException('Já existe um usuário com este telefone.'),
    );

    await expect(useCase.execute({ phone: '+5511999999999' })).rejects.toThrow(
      ConflictException,
    );
  });
});
