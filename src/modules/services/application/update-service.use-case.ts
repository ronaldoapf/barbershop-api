import { Injectable, NotFoundException } from '@nestjs/common';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ServiceEntity } from '../domain/service.entity';
import { UpdateServiceDto } from '../dto/update-service.dto';

@Injectable()
export class UpdateServiceUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}
  async execute(id: string, dto: UpdateServiceDto): Promise<ServiceEntity> {
    const existing = await this.servicesRepository.findById(id);
    if (!existing) throw new NotFoundException('Serviço não encontrado');
    return this.servicesRepository.update(id, dto);
  }
}
