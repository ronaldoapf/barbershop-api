import { SessionEntity } from './session.entity';

export interface CreateSessionData {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

export abstract class ISessionsRepository {
  abstract create(data: CreateSessionData): Promise<SessionEntity>;
  abstract findById(id: string): Promise<SessionEntity | null>;
  abstract updateRefreshTokenHash(
    id: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<SessionEntity>;
  abstract delete(id: string): Promise<void>;
  abstract deleteAllForUser(userId: string): Promise<void>;
}
