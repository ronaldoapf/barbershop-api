export class BarberEntity {
  id!: string;
  userId!: string;
  name!: string;
  avatarUrl!: string | null;
  commissionPercentage!: number;
  createdAt!: Date;
  disabledAt!: Date | null;
}
