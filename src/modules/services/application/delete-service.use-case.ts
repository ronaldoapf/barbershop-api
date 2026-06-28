import { Injectable, NotFoundException } from '@nestjs/common';
import { IServicesRepository } from '../domain/services.repository.interface';

@Injectable()
export class DeleteServiceUseCase {
  constructor(private readonly servicesRepository: IServicesRepository) {}
  async execute(id: string): Promise<void> {
    const existing = await this.servicesRepository.findById(id);
    if (!existing) throw new NotFoundException('Serviço não encontrado');
    await this.servicesRepository.softDelete(id);
  }
}
