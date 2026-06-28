import { Injectable } from '@nestjs/common';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { BarberEntity } from '../domain/barber.entity';

@Injectable()
export class ListBarbersUseCase {
  constructor(private readonly barbersRepository: IBarbersRepository) {}

  async execute(params: { page: number; limit: number }): Promise<PaginatedResult<BarberEntity>> {
    return this.barbersRepository.findAll(params);
  }
}
