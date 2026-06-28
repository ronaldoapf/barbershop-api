import { ConflictException, Injectable } from '@nestjs/common';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { RegisterDto } from '../dto/register.dto';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly bcryptService: BcryptService,
  ) {}

  async execute(dto: RegisterDto): Promise<UserEntity> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const passwordHash = await this.bcryptService.encrypt(dto.password);
    return this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash,
      role: UserRole.CUSTOMER,
    });
  }
}
