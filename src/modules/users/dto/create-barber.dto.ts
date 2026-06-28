import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBarberDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() password: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty({ minimum: 0, maximum: 100 }) @IsNumber() @Min(0) @Max(100) commissionPercentage: number;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
}
