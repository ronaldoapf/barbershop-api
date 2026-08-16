import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';

@Injectable()
export class ListBarbersUseCase {
  constructor(private readonly barbersRepository: IBarbersRepository) {}

  async execute(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<BarberEntity>> {
    return this.barbersRepository.list(page, limit);
  }
}
