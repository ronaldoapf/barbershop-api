import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsString, Matches, ValidateIf } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class SetWeeklyHoursDto {
  @ApiProperty({ description: 'Whether the barber works on this weekday' })
  @IsBoolean()
  isWorking: boolean;

  @ApiPropertyOptional({
    example: '09:00',
    description: 'Required when isWorking is true',
  })
  @ValidateIf((dto: SetWeeklyHoursDto) => dto.isWorking === true)
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @ApiPropertyOptional({
    example: '18:00',
    description: 'Required when isWorking is true',
  })
  @ValidateIf((dto: SetWeeklyHoursDto) => dto.isWorking === true)
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:mm format' })
  endTime?: string;
}
