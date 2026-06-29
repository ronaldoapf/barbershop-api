import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/application/pagination-query.dto';
import { ItemStatus } from '../domain/item-status.enum';

export class ListServicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional({ enum: ItemStatus }) @IsOptional() @IsEnum(ItemStatus) status?: ItemStatus;
}
