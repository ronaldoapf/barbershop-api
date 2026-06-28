import { Injectable, NotFoundException } from '@nestjs/common';
import { IBarbersRepository } from '../domain/barbers.repository.interface';

@Injectable()
export class DeleteBarberUseCase {
  constructor(private readonly barbersRepository: IBarbersRepository) {}

  async execute(id: string): Promise<void> {
    const barber = await this.barbersRepository.findById(id);
    if (!barber) throw new NotFoundException('Barbeiro não encontrado');
    await this.barbersRepository.softDelete(id);
  }
}
