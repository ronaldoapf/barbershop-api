import { Injectable } from '@nestjs/common';
import {
  CreateServiceData,
  IServicesRepository,
} from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';

@Injectable()
export class CreateServiceUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}

  async execute(data: CreateServiceData): Promise<ServiceEntity> {
    return this.servicesRepository.create(data);
  }
}
