import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SetDateExceptionDto {
  @ApiProperty({ example: '2026-12-25', description: 'Date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Whether the barber works on this date' })
  @IsBoolean()
  isWorking: boolean;

  @ApiPropertyOptional({
    example: '09:00',
    description: 'Required when isWorking is true',
  })
  @ValidateIf((dto: SetDateExceptionDto) => dto.isWorking === true)
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @ApiPropertyOptional({
    example: '18:00',
    description: 'Required when isWorking is true',
  })
  @ValidateIf((dto: SetDateExceptionDto) => dto.isWorking === true)
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:mm format' })
  endTime?: string;
}
