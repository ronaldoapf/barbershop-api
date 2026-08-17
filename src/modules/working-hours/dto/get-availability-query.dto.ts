import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class GetAvailabilityQueryDto {
  @ApiProperty({ example: '2026-12-25', description: 'Date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;
}
