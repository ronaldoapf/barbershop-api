import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';

@Injectable()
export class PresignAvatarUseCase {
  constructor(private readonly storageService: StorageService) {}

  async execute(userId: string, mimeType: string): Promise<{ url: string; key: string }> {
    const ext = mimeType.split('/')[1] ?? 'jpg';
    const key = `avatars/${userId}/${randomUUID()}.${ext}`;
    return this.storageService.getPresignedUploadUrl(key, mimeType);
  }
}
