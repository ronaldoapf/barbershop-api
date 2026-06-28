import { Injectable } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserRole } from '../domain/user-role.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { UserEntity } from '../domain/user.entity';

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(params: { role?: UserRole; page: number; limit: number }): Promise<PaginatedResult<UserEntity>> {
    return this.usersRepository.findAll(params);
  }
}
