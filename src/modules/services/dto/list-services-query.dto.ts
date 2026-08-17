import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/application/pagination-query.dto';
import { ItemStatus } from '../domain/item-status.enum';

export class ListServicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ItemStatus,
    description: 'OWNER only — non-OWNER callers always see ACTIVE services',
  })
  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;
}
