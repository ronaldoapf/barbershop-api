import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) order: number;
}
