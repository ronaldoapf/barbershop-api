import { Injectable } from '@nestjs/common';
import { Setting } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { ISettingsRepository } from '../domain/settings.repository.interface';
import { SettingEntity } from '../domain/setting.entity';

@Injectable()
export class SettingsRepository implements ISettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getByKey(key: string): Promise<SettingEntity | null> {
    const record = await this.prisma.setting.findUnique({ where: { key } });
    return record ? this.toEntity(record) : null;
  }

  async upsert(key: string, value: string): Promise<SettingEntity> {
    const record = await this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    return this.toEntity(record);
  }

  private toEntity(record: Setting): SettingEntity {
    return {
      id: record.id,
      key: record.key,
      value: record.value,
      updatedAt: record.updatedAt,
    };
  }
}
