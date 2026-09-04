import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FindOrCreateCustomerByPhoneDto {
  @ApiProperty({ maxLength: 20, example: '+5511999999999' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
