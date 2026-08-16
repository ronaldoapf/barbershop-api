export class BarberInviteEntity {
  id!: string;
  userId!: string;
  tokenHash!: string;
  expiresAt!: Date;
  acceptedAt!: Date | null;
  createdAt!: Date;
}
