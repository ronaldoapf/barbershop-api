import { UserRole } from './user-role.enum';

export class UserEntity {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  loyaltyPoints: number;
  avatarUrl: string | null;
  avatarStorageKey: string | null;
  createdAt: Date;
  disabledAt: Date | null;
}
