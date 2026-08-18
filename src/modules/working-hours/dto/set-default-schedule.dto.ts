import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_BUSINESS_DAYS = [1, 2, 3, 4, 5];

export class SetDefaultScheduleDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:mm format' })
  endTime: string;

  @ApiPropertyOptional({
    description:
      'Weekdays the barber works (0=Sunday..6=Saturday). Defaults to Monday-Friday.',
    example: DEFAULT_BUSINESS_DAYS,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];
}
