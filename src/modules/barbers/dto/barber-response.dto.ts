import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BarberEntity } from '../domain/barber.entity';

export class BarberResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty()
  commissionPercentage: number;

  @ApiProperty()
  createdAt: Date;

  constructor(entity: BarberEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.avatarUrl = entity.avatarUrl;
    this.commissionPercentage = entity.commissionPercentage;
    this.createdAt = entity.createdAt;
  }
}
