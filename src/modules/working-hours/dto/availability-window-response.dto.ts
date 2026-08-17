import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvailabilityWindow } from '../domain/availability-window';

export class AvailabilityWindowResponseDto {
  @ApiProperty()
  isWorking: boolean;

  @ApiPropertyOptional({ nullable: true, example: '09:00' })
  startTime: string | null;

  @ApiPropertyOptional({ nullable: true, example: '18:00' })
  endTime: string | null;

  constructor(window: AvailabilityWindow) {
    this.isWorking = window.isWorking;
    this.startTime = window.startTime;
    this.endTime = window.endTime;
  }
}
