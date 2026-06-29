import { ApiProperty } from '@nestjs/swagger';
import { CategoryEntity } from '../domain/category.entity';

export class CategoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() order: number;
  @ApiProperty() createdAt: Date;
}

export function toCategoryResponseDto(e: CategoryEntity): CategoryResponseDto {
  return { id: e.id, name: e.name, order: e.order, createdAt: e.createdAt };
}
