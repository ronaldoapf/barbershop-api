import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ResendInviteUseCase } from './resend-invite.use-case';
import { IBarberInvitesRepository } from '../domain/barber-invites.repository.interface';
import { BarberInviteEntity } from '../domain/barber-invite.entity';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { GetSettingUseCase } from '../../settings/application/get-setting.use-case';
import { IMailService } from '../../../shared/mail/mail.service';

describe('ResendInviteUseCase', () => {
  let useCase: ResendInviteUseCase;

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

  const getSettingUseCase = { execute: jest.fn() };
  const mailService = { sendBarberInviteEmail: jest.fn() };

  const invite: BarberInviteEntity = {
    id: 'invite-1',
    userId: 'user-1',
    tokenHash: 'old-hash',
    expiresAt: new Date(Date.now() - 1000),
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
        ResendInviteUseCase,
        {
          provide: IBarberInvitesRepository,
          useValue: barberInvitesRepository,
        },
        { provide: IUsersRepository, useValue: usersRepository },
        { provide: GetSettingUseCase, useValue: getSettingUseCase },
        { provide: IMailService, useValue: mailService },
      ],
    }).compile();

    useCase = module.get(ResendInviteUseCase);
  });

  it('regenerates the token/expiry and resends the email, even for an already-expired invite', async () => {
    barberInvitesRepository.findById.mockResolvedValue(invite);
    usersRepository.findById.mockResolvedValue(user);
    getSettingUseCase.execute.mockResolvedValue(null);

    await useCase.execute(invite.id);

    expect(barberInvitesRepository.updateToken).toHaveBeenCalledWith(
      invite.id,
      expect.any(String),
      expect.any(Date),
    );
    expect(mailService.sendBarberInviteEmail).toHaveBeenCalledWith({
      to: user.email,
      name: user.name,
      token: expect.any(String) as string,
    });
  });

  it('throws NotFoundException when the invite does not exist', async () => {
    barberInvitesRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when the invite was already accepted', async () => {
    barberInvitesRepository.findById.mockResolvedValue({
      ...invite,
      acceptedAt: new Date(),
    });

    await expect(useCase.execute(invite.id)).rejects.toThrow(ConflictException);
    expect(barberInvitesRepository.updateToken).not.toHaveBeenCalled();
  });
});
