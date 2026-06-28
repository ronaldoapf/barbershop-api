import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { UserEntity } from './user.entity';
import { UserRole } from './user-role.enum';

export abstract class IUsersRepository {
  abstract create(data: {
    name: string;
    email: string;
    phone: string | null;
    passwordHash: string | null;
    role: UserRole;
  }): Promise<UserEntity>;
  abstract findById(id: string): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract update(id: string, data: Partial<{ name: string; phone: string | null; avatarUrl: string | null; avatarStorageKey: string | null }>): Promise<UserEntity>;
  abstract updateLoyaltyPoints(id: string, delta: number): Promise<void>;
  abstract softDelete(id: string): Promise<void>;
  abstract findAll(params: { role?: UserRole; page: number; limit: number }): Promise<PaginatedResult<UserEntity>>;
}
