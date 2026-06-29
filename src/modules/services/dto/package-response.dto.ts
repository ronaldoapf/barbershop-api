import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemStatus } from '../domain/item-status.enum';
import { PackageEntity } from '../domain/package.entity';
import { ServiceResponseDto, toServiceResponseDto } from './service-response.dto';

export class PackageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string | null;
  @ApiProperty() price: number;
  @ApiProperty({ enum: ItemStatus }) status: ItemStatus;
  @ApiProperty() order: number;
  @ApiProperty() pointsEarned: number;
  @ApiProperty() pointsRequired: number;
  @ApiProperty({ type: [ServiceResponseDto] }) services: ServiceResponseDto[];
  @ApiProperty() createdAt: Date;
}

export function toPackageResponseDto(e: PackageEntity): PackageResponseDto {
  return { id: e.id, name: e.name, description: e.description, price: e.price, status: e.status, order: e.order, pointsEarned: e.pointsEarned, pointsRequired: e.pointsRequired, services: e.services.map(toServiceResponseDto), createdAt: e.createdAt };
}
