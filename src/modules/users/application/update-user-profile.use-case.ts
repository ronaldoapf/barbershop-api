import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IUsersRepository,
  UpdateUserData,
} from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';

@Injectable()
export class UpdateUserProfileUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(userId: string, data: UpdateUserData): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return this.usersRepository.update(userId, data);
  }
}
