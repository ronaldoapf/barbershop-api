import { Injectable, NotFoundException } from '@nestjs/common';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';
import { ItemStatus } from '../domain/item-status.enum';

@Injectable()
export class ToggleServiceStatusUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}
  async execute(id: string): Promise<ServiceEntity> {
    const service = await this.servicesRepository.findById(id);
    if (!service) throw new NotFoundException('Serviço não encontrado');
    const next = service.status === ItemStatus.ACTIVE ? ItemStatus.INACTIVE : ItemStatus.ACTIVE;
    return this.servicesRepository.updateStatus(id, next);
  }
}
