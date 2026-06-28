import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { PackageEntity } from './package.entity';
import { ItemStatus } from './item-status.enum';

export abstract class IPackagesRepository {
  abstract create(data: {
    name: string;
    description: string | null;
    price: number;
    order: number;
    pointsEarned: number;
    pointsRequired: number;
    serviceIds: string[];
  }): Promise<PackageEntity>;
  abstract findById(id: string): Promise<PackageEntity | null>;
  abstract findAll(params: { page: number; limit: number }): Promise<PaginatedResult<PackageEntity>>;
  abstract update(id: string, data: Partial<{ name: string; description: string | null; price: number; order: number; pointsEarned: number; pointsRequired: number; serviceIds: string[] }>): Promise<PackageEntity>;
  abstract updateStatus(id: string, status: ItemStatus): Promise<PackageEntity>;
  abstract softDelete(id: string): Promise<void>;
}
