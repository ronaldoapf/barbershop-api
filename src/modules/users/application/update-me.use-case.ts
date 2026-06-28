import { Injectable, NotFoundException } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UpdateMeDto } from '../dto/update-me.dto';

@Injectable()
export class UpdateMeUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(userId: string, dto: UpdateMeDto): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.usersRepository.update(userId, dto);
  }
}
