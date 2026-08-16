import { BarberInviteEntity } from './barber-invite.entity';

export interface CreateBarberInviteData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export abstract class IBarberInvitesRepository {
  abstract create(data: CreateBarberInviteData): Promise<BarberInviteEntity>;
  abstract findById(id: string): Promise<BarberInviteEntity | null>;
  abstract findByUserId(userId: string): Promise<BarberInviteEntity | null>;
  abstract findByTokenHash(
    tokenHash: string,
  ): Promise<BarberInviteEntity | null>;
  abstract markAccepted(id: string): Promise<BarberInviteEntity>;
  abstract updateToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<BarberInviteEntity>;
}
