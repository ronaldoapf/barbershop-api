export abstract class ISessionsRepository {
  abstract create(data: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  }): Promise<void>;
  abstract findById(id: string): Promise<{ id: string; userId: string; refreshTokenHash: string; expiresAt: Date } | null>;
  abstract deleteById(id: string): Promise<void>;
}
