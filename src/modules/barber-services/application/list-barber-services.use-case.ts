import { Injectable, NotFoundException } from '@nestjs/common';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { ServiceEntity } from '../../services/domain/service.entity';
import { IBarberServicesRepository } from '../domain/barber-services.repository.interface';

@Injectable()
export class ListBarberServicesUseCase {
  constructor(
    private readonly barberServicesRepository: IBarberServicesRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(barberId: string): Promise<ServiceEntity[]> {
    const barber = await this.barbersRepository.findById(barberId);
    if (!barber) {
      throw new NotFoundException('Barbeiro não encontrado.');
    }

    return this.barberServicesRepository.listByBarber(barberId);
  }
}
