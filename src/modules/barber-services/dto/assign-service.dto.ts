import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignServiceDto {
  @ApiProperty()
  @IsString()
  serviceId: string;
}
