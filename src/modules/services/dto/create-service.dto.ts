import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ description: 'Price in cents' }) @IsInt() @Min(0) price: number;
  @ApiProperty() @IsInt() @Min(1) durationMinutes: number;
  @ApiProperty() @IsInt() @Min(0) order: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) pointsEarned?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) pointsRequired?: number;
}
