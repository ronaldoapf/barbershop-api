import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Price in cents', example: 5000 })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiProperty({ description: 'Display order in the catalog' })
  @IsInt()
  @Min(0)
  order: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsEarned?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsRequired?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Barbers to assign as able to perform this service',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  barberIds?: string[];
}
