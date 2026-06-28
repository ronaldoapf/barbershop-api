import { Injectable, NotFoundException } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import { UserEntity } from '../domain/user.entity';

@Injectable()
export class ConfirmAvatarUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(userId: string, storageKey: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.avatarStorageKey) {
      await this.storageService.deleteObject(user.avatarStorageKey).catch(() => null);
    }

    const url = this.storageService.getPublicUrl(storageKey);
    return this.usersRepository.update(userId, { avatarUrl: url, avatarStorageKey: storageKey });
  }
}
