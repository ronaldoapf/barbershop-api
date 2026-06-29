import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemStatus } from '../domain/item-status.enum';
import { ServiceEntity } from '../domain/service.entity';

export class ServiceResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() categoryId: string | null;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() price: number;
  @ApiProperty() durationMinutes: number;
  @ApiProperty({ enum: ItemStatus }) status: ItemStatus;
  @ApiProperty() order: number;
  @ApiProperty() pointsEarned: number;
  @ApiProperty() pointsRequired: number;
  @ApiProperty() createdAt: Date;
}

export function toServiceResponseDto(e: ServiceEntity): ServiceResponseDto {
  return { id: e.id, categoryId: e.categoryId, name: e.name, description: e.description, price: e.price, durationMinutes: e.durationMinutes, status: e.status, order: e.order, pointsEarned: e.pointsEarned, pointsRequired: e.pointsRequired, createdAt: e.createdAt };
}
