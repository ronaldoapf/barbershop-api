import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsISO8601, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsString()
  barberId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  serviceIds: string[];

  @ApiProperty({ example: '2026-08-20T14:00:00.000Z' })
  @IsISO8601()
  startsAt: string;
}
