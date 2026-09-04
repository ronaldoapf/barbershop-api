import { ConflictException, Injectable } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

export interface FindOrCreateCustomerByPhoneInput {
  phone: string;
  name?: string;
}

const DEFAULT_WHATSAPP_CUSTOMER_NAME = 'Cliente WhatsApp';

@Injectable()
export class FindOrCreateCustomerByPhoneUseCase {
  constructor(private readonly usersRepository: IUsersRepository) {}

  async execute(input: FindOrCreateCustomerByPhoneInput): Promise<UserEntity> {
    const existing = await this.usersRepository.findByPhone(input.phone);
    if (existing) {
      return existing;
    }

    try {
      return await this.usersRepository.create({
        name: input.name ?? DEFAULT_WHATSAPP_CUSTOMER_NAME,
        phone: input.phone,
        role: UserRole.CUSTOMER,
      });
    } catch (e) {
      if (e instanceof ConflictException) {
        const recovered = await this.usersRepository.findByPhone(input.phone);
        if (recovered) {
          return recovered;
        }
      }
      throw e;
    }
  }
}
