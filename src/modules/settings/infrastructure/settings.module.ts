import { Module } from '@nestjs/common';
import { GetSettingUseCase } from '../application/get-setting.use-case';
import { ISettingsRepository } from '../domain/settings.repository.interface';
import { SettingsRepository } from './settings.repository';

@Module({
  providers: [
    { provide: ISettingsRepository, useClass: SettingsRepository },
    GetSettingUseCase,
  ],
  exports: [ISettingsRepository, GetSettingUseCase],
})
export class SettingsModule {}
