import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CompleteAppointmentItemDto {
  @ApiProperty()
  @IsString()
  appointmentServiceId: string;

  @ApiProperty()
  @IsBoolean()
  redeemedWithPoints: boolean;
}

export class CompleteAppointmentDto {
  @ApiPropertyOptional({
    type: [CompleteAppointmentItemDto],
    description:
      'Which AppointmentService items are redeemed with points; omitted items default to not redeemed',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteAppointmentItemDto)
  items?: CompleteAppointmentItemDto[];
}
