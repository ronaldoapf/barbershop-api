import {
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AcceptInviteUseCase } from './accept-invite.use-case';
import { IBarberInvitesRepository } from '../domain/barber-invites.repository.interface';
import { BarberInviteEntity } from '../domain/barber-invite.entity';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { BarberEntity } from '../../barbers/domain/barber.entity';
import { GetSettingUseCase } from '../../settings/application/get-setting.use-case';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';

describe('AcceptInviteUseCase', () => {
  let useCase: AcceptInviteUseCase;

  const barberInvitesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByTokenHash: jest.fn(),
    markAccepted: jest.fn(),
    updateToken: jest.fn(),
  };

  const usersRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const barbersRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    list: jest.fn(),
    updateCommission: jest.fn(),
  };

  const getSettingUseCase = { execute: jest.fn() };
  const bcryptService = { encrypt: jest.fn(), compare: jest.fn() };

  const invite: BarberInviteEntity = {
    id: 'invite-1',
    userId: 'user-1',
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 86400000),
    acceptedAt: null,
    createdAt: new Date(),
  };

  const newBarberUser: UserEntity = {
    id: 'user-1',
    name: 'New Barber',
    email: 'new-barber@example.com',
    phone: null,
    passwordHash: null,
    role: UserRole.BARBER,
    loyaltyPoints: 0,
    avatarUrl: null,
    avatarStorageKey: null,
    createdAt: new Date(),
    disabledAt: null,
  };

  const barber: BarberEntity = {
    id: 'barber-1',
    userId: 'user-1',
    name: 'New Barber',
    avatarUrl: null,
    commissionPercentage: 30,
    createdAt: new Date(),
    disabledAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptInviteUseCase,
        {
          provide: IBarberInvitesRepository,
          useValue: barberInvitesRepository,
        },
        { provide: IUsersRepository, useValue: usersRepository },
        { provide: IBarbersRepository, useValue: barbersRepository },
        { provide: GetSettingUseCase, useValue: getSettingUseCase },
        { provide: BcryptService, useValue: bcryptService },
      ],
    }).compile();

    useCase = module.get(AcceptInviteUseCase);
  });

  it('sets a password, promotes to BARBER, and creates the Barber row for a brand-new user', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue(invite);
    usersRepository.findById.mockResolvedValue(newBarberUser);
    bcryptService.encrypt.mockResolvedValue('hashed-password');
    getSettingUseCase.execute.mockResolvedValue('35');
    barbersRepository.create.mockResolvedValue(barber);

    const result = await useCase.execute({
      token: 'plain-token',
      password: 'super-secret-pw',
    });

    expect(bcryptService.encrypt).toHaveBeenCalledWith('super-secret-pw');
    expect(usersRepository.update).toHaveBeenCalledWith(newBarberUser.id, {
      role: UserRole.BARBER,
      passwordHash: 'hashed-password',
    });
    expect(barbersRepository.create).toHaveBeenCalledWith({
      userId: newBarberUser.id,
      commissionPercentage: 35,
    });
    expect(barberInvitesRepository.markAccepted).toHaveBeenCalledWith(
      invite.id,
    );
    expect(result).toEqual(barber);
  });

  it('throws BadRequestException when a brand-new user omits the password', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue(invite);
    usersRepository.findById.mockResolvedValue(newBarberUser);

    await expect(useCase.execute({ token: 'plain-token' })).rejects.toThrow(
      BadRequestException,
    );
    expect(usersRepository.update).not.toHaveBeenCalled();
  });

  it('promotes an existing customer without touching their password', async () => {
    const existingCustomer: UserEntity = {
      ...newBarberUser,
      role: UserRole.CUSTOMER,
      passwordHash: 'already-set',
    };
    barberInvitesRepository.findByTokenHash.mockResolvedValue(invite);
    usersRepository.findById.mockResolvedValue(existingCustomer);
    getSettingUseCase.execute.mockResolvedValue(null);
    barbersRepository.create.mockResolvedValue(barber);

    await useCase.execute({ token: 'plain-token' });

    expect(bcryptService.encrypt).not.toHaveBeenCalled();
    expect(usersRepository.update).toHaveBeenCalledWith(existingCustomer.id, {
      role: UserRole.BARBER,
    });
  });

  it('defaults commissionPercentage to 0 when the setting is missing', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue(invite);
    usersRepository.findById.mockResolvedValue({
      ...newBarberUser,
      passwordHash: 'already-set',
    });
    getSettingUseCase.execute.mockResolvedValue(null);
    barbersRepository.create.mockResolvedValue(barber);

    await useCase.execute({ token: 'plain-token' });

    expect(barbersRepository.create).toHaveBeenCalledWith({
      userId: newBarberUser.id,
      commissionPercentage: 0,
    });
  });

  it('throws NotFoundException when the invite does not exist', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute({ token: 'invalid' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ConflictException when the invite was already accepted', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue({
      ...invite,
      acceptedAt: new Date(),
    });

    await expect(useCase.execute({ token: 'plain-token' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws GoneException when the invite has expired', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue({
      ...invite,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(useCase.execute({ token: 'plain-token' })).rejects.toThrow(
      GoneException,
    );
  });
});
