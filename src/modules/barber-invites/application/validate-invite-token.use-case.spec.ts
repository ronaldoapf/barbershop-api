import {
  ConflictException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidateInviteTokenUseCase } from './validate-invite-token.use-case';
import { IBarberInvitesRepository } from '../domain/barber-invites.repository.interface';
import { BarberInviteEntity } from '../domain/barber-invite.entity';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';

describe('ValidateInviteTokenUseCase', () => {
  let useCase: ValidateInviteTokenUseCase;

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

  const invite: BarberInviteEntity = {
    id: 'invite-1',
    userId: 'user-1',
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 86400000),
    acceptedAt: null,
    createdAt: new Date(),
  };

  const user: UserEntity = {
    id: 'user-1',
    name: 'Invited Barber',
    email: 'barber@example.com',
    phone: null,
    passwordHash: null,
    role: UserRole.BARBER,
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
        ValidateInviteTokenUseCase,
        {
          provide: IBarberInvitesRepository,
          useValue: barberInvitesRepository,
        },
        { provide: IUsersRepository, useValue: usersRepository },
      ],
    }).compile();

    useCase = module.get(ValidateInviteTokenUseCase);
  });

  it('returns the invite preview for a valid pending invite', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue(invite);
    usersRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute('plain-token');

    expect(result).toEqual({
      name: user.name,
      email: user.email,
      expiresAt: invite.expiresAt,
    });
  });

  it('throws NotFoundException when the token does not match any invite', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute('invalid')).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when the invite was already accepted', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue({
      ...invite,
      acceptedAt: new Date(),
    });

    await expect(useCase.execute('plain-token')).rejects.toThrow(
      ConflictException,
    );
  });

  it('throws GoneException when the invite has expired', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue({
      ...invite,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(useCase.execute('plain-token')).rejects.toThrow(GoneException);
  });

  it('throws NotFoundException when the linked user is missing', async () => {
    barberInvitesRepository.findByTokenHash.mockResolvedValue(invite);
    usersRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('plain-token')).rejects.toThrow(
      NotFoundException,
    );
  });
});
