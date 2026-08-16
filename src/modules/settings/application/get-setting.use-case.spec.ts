import { Test, TestingModule } from '@nestjs/testing';
import { GetSettingUseCase } from './get-setting.use-case';
import { ISettingsRepository } from '../domain/settings.repository.interface';
import { SettingEntity } from '../domain/setting.entity';

describe('GetSettingUseCase', () => {
  let useCase: GetSettingUseCase;

  const settingsRepository = {
    getByKey: jest.fn(),
    upsert: jest.fn(),
  };

  const setting: SettingEntity = {
    id: 'setting-1',
    key: 'default_commission_percentage',
    value: '30',
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSettingUseCase,
        { provide: ISettingsRepository, useValue: settingsRepository },
      ],
    }).compile();

    useCase = module.get(GetSettingUseCase);
  });

  it('returns the setting value when found', async () => {
    settingsRepository.getByKey.mockResolvedValue(setting);

    const result = await useCase.execute(setting.key);

    expect(settingsRepository.getByKey).toHaveBeenCalledWith(setting.key);
    expect(result).toBe(setting.value);
  });

  it('returns null when the setting does not exist', async () => {
    settingsRepository.getByKey.mockResolvedValue(null);

    const result = await useCase.execute('missing_key');

    expect(result).toBeNull();
  });
});
