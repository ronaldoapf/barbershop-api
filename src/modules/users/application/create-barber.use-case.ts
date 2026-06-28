import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IUsersRepository } from '../domain/users.repository.interface';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarberEntity } from '../domain/barber.entity';
import { UserRole } from '../domain/user-role.enum';
import { CreateBarberDto } from '../dto/create-barber.dto';

@Injectable()
export class CreateBarberUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(dto: CreateBarberDto): Promise<BarberEntity> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: UserRole.BARBER,
    });

    return this.barbersRepository.create({
      userId: user.id,
      commissionPercentage: dto.commissionPercentage,
    });
  }
}
