import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BarberInviteEntity } from '../domain/barber-invite.entity';

export class BarberInviteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiPropertyOptional({ nullable: true })
  acceptedAt: Date | null;

  constructor(entity: BarberInviteEntity) {
    this.id = entity.id;
    this.expiresAt = entity.expiresAt;
    this.acceptedAt = entity.acceptedAt;
  }
}
