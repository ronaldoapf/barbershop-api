import { Injectable } from '@nestjs/common';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ItemStatus } from '../domain/item-status.enum';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { ServiceEntity } from '../domain/service.entity';

@Injectable()
export class ListServicesUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}
  async execute(params: { categoryId?: string; status?: ItemStatus; page: number; limit: number }): Promise<PaginatedResult<ServiceEntity>> {
    return this.servicesRepository.findAll(params);
  }
}
