import { ConflictException } from '@nestjs/common';
import { RegisterUseCase } from './register.use-case';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { UserEntity } from '../../users/domain/user.entity';

const mockUsersRepo = (): jest.Mocked<IUsersRepository> => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  updateLoyaltyPoints: jest.fn(),
  softDelete: jest.fn(),
  findAll: jest.fn(),
});

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;
  let usersRepo: jest.Mocked<IUsersRepository>;

  beforeEach(() => {
    usersRepo = mockUsersRepo();
    useCase = new RegisterUseCase(usersRepo);
  });

  it('throws ConflictException if email already exists', async () => {
    usersRepo.findByEmail.mockResolvedValue({ id: '1' } as UserEntity);
    await expect(
      useCase.execute({ name: 'Ana', email: 'ana@test.com', password: 'password123' }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates user with hashed password when email is new', async () => {
    usersRepo.findByEmail.mockResolvedValue(null);
    usersRepo.create.mockResolvedValue({ id: '1', role: UserRole.CUSTOMER } as UserEntity);

    await useCase.execute({ name: 'Ana', email: 'ana@test.com', password: 'password123' });

    expect(usersRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@test.com', role: UserRole.CUSTOMER }),
    );
    const calledWith = usersRepo.create.mock.calls[0][0];
    expect(calledWith.passwordHash).not.toBe('password123');
  });
});
