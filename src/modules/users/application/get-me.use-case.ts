import { Injectable, NotFoundException } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';

@Injectable()
export class GetMeUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
