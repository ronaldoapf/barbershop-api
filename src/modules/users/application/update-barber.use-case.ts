import { Injectable, NotFoundException } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';
import { UpdateBarberDto } from '../dto/update-barber.dto';

@Injectable()
export class UpdateBarberUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(id: string, dto: UpdateBarberDto): Promise<BarberEntity> {
    const barber = await this.barbersRepository.findById(id);
    if (!barber) throw new NotFoundException('Barbeiro não encontrado');

    if (dto.name || dto.phone) {
      await this.usersRepository.update(barber.userId, { name: dto.name, phone: dto.phone });
    }
    if (dto.commissionPercentage !== undefined) {
      return this.barbersRepository.update(id, { commissionPercentage: dto.commissionPercentage });
    }
    return this.barbersRepository.findById(id) as Promise<BarberEntity>;
  }
}
