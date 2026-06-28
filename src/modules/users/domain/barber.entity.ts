import { UserEntity } from './user.entity';

export class BarberEntity {
  id: string;
  userId: string;
  commissionPercentage: number;
  user: UserEntity;
  createdAt: Date;
  disabledAt: Date | null;
}
