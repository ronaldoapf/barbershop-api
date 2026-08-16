import { UserEntity } from './user.entity';
import { UserRole } from './user-role.enum';

export interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  role?: UserRole;
}

export interface UpdateUserData {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  avatarStorageKey?: string;
}

export abstract class IUsersRepository {
  abstract findById(id: string): Promise<UserEntity | null>;
  abstract findByEmail(email: string): Promise<UserEntity | null>;
  abstract create(data: CreateUserData): Promise<UserEntity>;
  abstract update(id: string, data: UpdateUserData): Promise<UserEntity>;
  abstract softDelete(id: string): Promise<void>;
}
