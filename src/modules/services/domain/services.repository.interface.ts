import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { ServiceEntity } from './service.entity';
import { ItemStatus } from './item-status.enum';

export abstract class IServicesRepository {
  abstract create(data: {
    categoryId: string | null;
    name: string;
    description: string | null;
    price: number;
    durationMinutes: number;
    order: number;
    pointsEarned: number;
    pointsRequired: number;
  }): Promise<ServiceEntity>;
  abstract findById(id: string): Promise<ServiceEntity | null>;
  abstract findAll(params: { categoryId?: string; status?: ItemStatus; page: number; limit: number }): Promise<PaginatedResult<ServiceEntity>>;
  abstract update(id: string, data: Partial<Omit<ServiceEntity, 'id' | 'createdAt' | 'disabledAt'>>): Promise<ServiceEntity>;
  abstract updateStatus(id: string, status: ItemStatus): Promise<ServiceEntity>;
  abstract softDelete(id: string): Promise<void>;
}
