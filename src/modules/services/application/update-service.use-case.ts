import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IServicesRepository,
  UpdateServiceData,
} from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';

@Injectable()
export class UpdateServiceUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}

  async execute(id: string, data: UpdateServiceData): Promise<ServiceEntity> {
    const service = await this.servicesRepository.findById(id);
    if (!service) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    return this.servicesRepository.update(id, data);
  }
}
