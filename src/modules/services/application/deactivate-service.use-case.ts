import { Injectable, NotFoundException } from '@nestjs/common';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ItemStatus } from '../domain/item-status.enum';
import { ServiceEntity } from '../domain/service.entity';

@Injectable()
export class DeactivateServiceUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}

  async execute(id: string): Promise<ServiceEntity> {
    const service = await this.servicesRepository.findById(id);
    if (!service) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    return this.servicesRepository.update(id, { status: ItemStatus.INACTIVE });
  }
}
