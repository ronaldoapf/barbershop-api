import { Injectable, NotFoundException } from '@nestjs/common';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { IServicesRepository } from '../../services/domain/services.repository.interface';
import { ServiceEntity } from '../../services/domain/service.entity';
import { IBarberServicesRepository } from '../domain/barber-services.repository.interface';

@Injectable()
export class AssignServiceToBarberUseCase {
  constructor(
    private readonly barberServicesRepository: IBarberServicesRepository,
    private readonly barbersRepository: IBarbersRepository,
    private readonly servicesRepository: IServicesRepository,
  ) {}

  async execute(barberId: string, serviceId: string): Promise<ServiceEntity> {
    const barber = await this.barbersRepository.findById(barberId);
    if (!barber) {
      throw new NotFoundException('Barbeiro não encontrado.');
    }

    const service = await this.servicesRepository.findById(serviceId);
    if (!service) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    await this.barberServicesRepository.assign(barberId, serviceId);
    return service;
  }
}
