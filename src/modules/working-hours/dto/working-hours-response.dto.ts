import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BarberWorkingHoursEntity } from '../domain/barber-working-hours.entity';
import { WorkingHoursType } from '../domain/working-hours-type.enum';

export class WorkingHoursResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  barberId: string;

  @ApiProperty({ enum: WorkingHoursType })
  type: WorkingHoursType;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 6 })
  dayOfWeek: number | null;

  @ApiPropertyOptional({ nullable: true })
  date: Date | null;

  @ApiPropertyOptional({ nullable: true, example: '09:00' })
  startTime: string | null;

  @ApiPropertyOptional({ nullable: true, example: '18:00' })
  endTime: string | null;

  @ApiProperty()
  isWorking: boolean;

  @ApiProperty()
  createdAt: Date;

  constructor(entity: BarberWorkingHoursEntity) {
    this.id = entity.id;
    this.barberId = entity.barberId;
    this.type = entity.type;
    this.dayOfWeek = entity.dayOfWeek;
    this.date = entity.date;
    this.startTime = entity.startTime;
    this.endTime = entity.endTime;
    this.isWorking = entity.isWorking;
    this.createdAt = entity.createdAt;
  }
}
