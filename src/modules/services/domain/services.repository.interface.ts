import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { ItemStatus } from './item-status.enum';
import { ServiceEntity } from './service.entity';

export interface CreateServiceData {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  order: number;
  pointsEarned?: number;
  pointsRequired?: number;
  barberIds?: string[];
}

export interface UpdateServiceData {
  name?: string;
  description?: string;
  price?: number;
  durationMinutes?: number;
  status?: ItemStatus;
  order?: number;
  pointsEarned?: number;
  pointsRequired?: number;
}

export abstract class IServicesRepository {
  abstract create(data: CreateServiceData): Promise<ServiceEntity>;
  abstract update(id: string, data: UpdateServiceData): Promise<ServiceEntity>;
  abstract findById(id: string): Promise<ServiceEntity | null>;
  abstract list(
    page: number,
    limit: number,
    status?: ItemStatus,
  ): Promise<PaginatedResult<ServiceEntity>>;
  abstract softDelete(id: string): Promise<void>;
}
