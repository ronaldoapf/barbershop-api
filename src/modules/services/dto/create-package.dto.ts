import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePackageDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ description: 'Price in cents' }) @IsInt() @Min(0) price: number;
  @ApiProperty() @IsInt() @Min(0) order: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) pointsEarned?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) pointsRequired?: number;
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) serviceIds: string[];
}
