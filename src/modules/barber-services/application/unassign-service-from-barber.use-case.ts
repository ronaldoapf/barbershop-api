import { Injectable } from '@nestjs/common';
import { IBarberServicesRepository } from '../domain/barber-services.repository.interface';

@Injectable()
export class UnassignServiceFromBarberUseCase {
  constructor(
    private readonly barberServicesRepository: IBarberServicesRepository,
  ) {}

  async execute(barberId: string, serviceId: string): Promise<void> {
    await this.barberServicesRepository.unassign(barberId, serviceId);
  }
}
