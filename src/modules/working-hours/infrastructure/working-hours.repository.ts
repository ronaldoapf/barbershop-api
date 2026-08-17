import { Injectable } from '@nestjs/common';
import { BarberWorkingHours } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { WorkingHoursType } from '../domain/working-hours-type.enum';
import {
  CreateWorkingHoursData,
  IWorkingHoursRepository,
  UpdateWorkingHoursData,
} from '../domain/working-hours.repository.interface';

@Injectable()
export class WorkingHoursRepository implements IWorkingHoursRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByBarber(barberId: string): Promise<BarberWorkingHoursEntity[]> {
    const records = await this.prisma.barberWorkingHours.findMany({
      where: { barberId, disabledAt: null },
    });
    return records.map((record) => this.toEntity(record));
  }

  async create(
    data: CreateWorkingHoursData,
  ): Promise<BarberWorkingHoursEntity> {
    const record = await this.prisma.barberWorkingHours.create({ data });
    return this.toEntity(record);
  }

  async update(
    id: string,
    data: UpdateWorkingHoursData,
  ): Promise<BarberWorkingHoursEntity> {
    const record = await this.prisma.barberWorkingHours.update({
      where: { id },
      data,
    });
    return this.toEntity(record);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.barberWorkingHours.update({
      where: { id },
      data: { disabledAt: new Date() },
    });
  }

  private toEntity(record: BarberWorkingHours): BarberWorkingHoursEntity {
    return {
      id: record.id,
      barberId: record.barberId,
      type: record.type as WorkingHoursType,
      dayOfWeek: record.dayOfWeek,
      date: record.date,
      startTime: record.startTime,
      endTime: record.endTime,
      isWorking: record.isWorking,
      createdAt: record.createdAt,
      disabledAt: record.disabledAt,
    };
  }
}
