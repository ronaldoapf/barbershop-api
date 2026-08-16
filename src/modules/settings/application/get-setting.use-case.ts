import { Injectable } from '@nestjs/common';
import { ISettingsRepository } from '../domain/settings.repository.interface';

@Injectable()
export class GetSettingUseCase {
  constructor(private readonly settingsRepository: ISettingsRepository) {}

  async execute(key: string): Promise<string | null> {
    const setting = await this.settingsRepository.getByKey(key);
    return setting?.value ?? null;
  }
}
