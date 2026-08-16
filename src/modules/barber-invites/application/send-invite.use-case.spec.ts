import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SendInviteUseCase } from './send-invite.use-case';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { UserEntity } from '../../users/domain/user.entity';
import { GetSettingUseCase } from '../../settings/application/get-setting.use-case';
import { IMailService } from '../../../shared/mail/mail.service';
import { IBarberInvitesRepository } from '../domain/barber-invites.repository.interface';
import { BarberInviteEntity } from '../domain/barber-invite.entity';

describe('SendInviteUseCase', () => {
  let useCase: SendInviteUseCase;

  const usersRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const barberInvitesRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByTokenHash: jest.fn(),
    markAccepted: jest.fn(),
    updateToken: jest.fn(),
  };

  const getSettingUseCase = { execute: jest.fn() };
  const mailService = { sendBarberInviteEmail: jest.fn() };

  const invite: BarberInviteEntity = {
    id: 'invite-1',
    userId: 'user-1',
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 86400000),
    acceptedAt: null,
    createdAt: new Date(),
  };

  const customer: UserEntity = {
    id: 'user-1',
    name: 'Existing Customer',
    email: 'customer@example.com',
    phone: null,
    passwordHash: 'hashed',
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
        SendInviteUseCase,
        { provide: IUsersRepository, useValue: usersRepository },
        {
          provide: IBarberInvitesRepository,
          useValue: barberInvitesRepository,
        },
        { provide: GetSettingUseCase, useValue: getSettingUseCase },
        { provide: IMailService, useValue: mailService },
      ],
    }).compile();

    useCase = module.get(SendInviteUseCase);
  });

  it('creates a new active user with no password when the email does not exist', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockResolvedValue({
      ...customer,
      id: 'new-user',
      name: 'New Barber',
      email: 'new-barber@example.com',
      role: UserRole.BARBER,
      passwordHash: null,
    });
    barberInvitesRepository.findByUserId.mockResolvedValue(null);
    getSettingUseCase.execute.mockResolvedValue(null);
    barberInvitesRepository.create.mockResolvedValue(invite);

    const result = await useCase.execute({
      name: 'New Barber',
      email: 'new-barber@example.com',
    });

    expect(usersRepository.create).toHaveBeenCalledWith({
      name: 'New Barber',
      email: 'new-barber@example.com',
      role: UserRole.BARBER,
    });
    expect(barberInvitesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'new-user' }),
    );
    expect(mailService.sendBarberInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new-barber@example.com',
        name: 'New Barber',
        token: expect.any(String) as string,
      }),
    );
    expect(result).toEqual(invite);
  });

  it('reuses an existing CUSTOMER without changing their role yet', async () => {
    usersRepository.findByEmail.mockResolvedValue(customer);
    barberInvitesRepository.findByUserId.mockResolvedValue(null);
    getSettingUseCase.execute.mockResolvedValue('14');
    barberInvitesRepository.create.mockResolvedValue(invite);

    await useCase.execute({ name: 'Ignored', email: customer.email });

    expect(usersRepository.create).not.toHaveBeenCalled();
    expect(usersRepository.update).not.toHaveBeenCalled();
    expect(barberInvitesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: customer.id }),
    );
    expect(mailService.sendBarberInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ name: customer.name }),
    );
  });

  it('throws ConflictException when the existing user is already a BARBER', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      ...customer,
      role: UserRole.BARBER,
    });

    await expect(
      useCase.execute({ name: 'X', email: customer.email }),
    ).rejects.toThrow(ConflictException);
    expect(barberInvitesRepository.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when the existing user is already an OWNER', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      ...customer,
      role: UserRole.OWNER,
    });

    await expect(
      useCase.execute({ name: 'X', email: customer.email }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException when a pending invite already exists', async () => {
    usersRepository.findByEmail.mockResolvedValue(customer);
    barberInvitesRepository.findByUserId.mockResolvedValue(invite);

    await expect(
      useCase.execute({ name: 'X', email: customer.email }),
    ).rejects.toThrow(ConflictException);
    expect(barberInvitesRepository.create).not.toHaveBeenCalled();
  });

  it('allows a new invite when the previous one was already accepted', async () => {
    usersRepository.findByEmail.mockResolvedValue(customer);
    barberInvitesRepository.findByUserId.mockResolvedValue({
      ...invite,
      acceptedAt: new Date(),
    });
    getSettingUseCase.execute.mockResolvedValue(null);
    barberInvitesRepository.create.mockResolvedValue(invite);

    await useCase.execute({ name: 'X', email: customer.email });

    expect(barberInvitesRepository.create).toHaveBeenCalled();
  });
});
