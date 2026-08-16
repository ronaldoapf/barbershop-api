import { ConflictException, Injectable } from '@nestjs/common';
import {
  CreateUserData,
  IUsersRepository,
} from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(data: CreateUserData): Promise<UserEntity> {
    const existing = await this.usersRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }

    return this.usersRepository.create(data);
  }
}
