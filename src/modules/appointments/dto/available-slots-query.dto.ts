import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsString,
} from 'class-validator';

export class AvailableSlotsQueryDto {
  @ApiProperty()
  @IsString()
  barberId: string;

  @ApiProperty({ type: [String] })
  @Transform(({ value }: { value: unknown }): unknown[] =>
    Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  serviceIds: string[];

  @ApiProperty({ example: '2026-08-20' })
  @IsDateString()
  date: string;
}
