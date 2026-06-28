import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { BarberEntity } from './barber.entity';

export abstract class IBarbersRepository {
  abstract create(data: { userId: string; commissionPercentage: number }): Promise<BarberEntity>;
  abstract findById(id: string): Promise<BarberEntity | null>;
  abstract findByUserId(userId: string): Promise<BarberEntity | null>;
  abstract findAll(params: { page: number; limit: number }): Promise<PaginatedResult<BarberEntity>>;
  abstract update(id: string, data: Partial<{ commissionPercentage: number }>): Promise<BarberEntity>;
  abstract softDelete(id: string): Promise<void>;
}
