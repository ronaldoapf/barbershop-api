import { Injectable, NotFoundException } from '@nestjs/common';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';

@Injectable()
export class UpdateCommissionUseCase {
  constructor(private readonly barbersRepository: IBarbersRepository) {}

  async execute(
    id: string,
    commissionPercentage: number,
  ): Promise<BarberEntity> {
    const barber = await this.barbersRepository.findById(id);
    if (!barber) {
      throw new NotFoundException('Barbeiro não encontrado.');
    }

    return this.barbersRepository.updateCommission(id, commissionPercentage);
  }
}
