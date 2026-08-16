import { SettingEntity } from './setting.entity';

export abstract class ISettingsRepository {
  abstract getByKey(key: string): Promise<SettingEntity | null>;
  abstract upsert(key: string, value: string): Promise<SettingEntity>;
}
