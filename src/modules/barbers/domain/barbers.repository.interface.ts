import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { BarberEntity } from './barber.entity';

export abstract class IBarbersRepository {
  abstract findById(id: string): Promise<BarberEntity | null>;
  abstract findByUserId(userId: string): Promise<BarberEntity | null>;
  abstract list(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<BarberEntity>>;
  abstract updateCommission(
    id: string,
    commissionPercentage: number,
  ): Promise<BarberEntity>;
}
