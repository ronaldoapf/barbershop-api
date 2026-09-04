import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemStatus } from '../domain/item-status.enum';
import { ServiceEntity } from '../domain/service.entity';

class ServiceBarberDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class ServiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Price in cents' })
  price: number;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty({ enum: ItemStatus })
  status: ItemStatus;

  @ApiProperty()
  order: number;

  @ApiProperty()
  pointsEarned: number;

  @ApiProperty()
  pointsRequired: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [ServiceBarberDto] })
  barbers: ServiceBarberDto[];

  constructor(entity: ServiceEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.description = entity.description;
    this.price = entity.price;
    this.durationMinutes = entity.durationMinutes;
    this.status = entity.status;
    this.order = entity.order;
    this.pointsEarned = entity.pointsEarned;
    this.pointsRequired = entity.pointsRequired;
    this.createdAt = entity.createdAt;
    this.barbers = entity.barbers;
  }
}
