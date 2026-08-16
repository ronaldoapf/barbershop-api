export class SessionEntity {
  id!: string;
  userId!: string;
  refreshTokenHash!: string;
  userAgent!: string | null;
  ipAddress!: string | null;
  expiresAt!: Date;
  createdAt!: Date;
}
