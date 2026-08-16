import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateCommissionDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 30 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPercentage: number;
}
