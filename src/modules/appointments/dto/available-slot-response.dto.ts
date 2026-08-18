import { ApiProperty } from '@nestjs/swagger';

export class AvailableSlotResponseDto {
  @ApiProperty()
  startsAt: Date;

  constructor(startsAt: Date) {
    this.startsAt = startsAt;
  }
}
