import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class RegisterUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(dto: RegisterDto): Promise<UserEntity> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash,
      role: UserRole.CUSTOMER,
    });
  }
}
