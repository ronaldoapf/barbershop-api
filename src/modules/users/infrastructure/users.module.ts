import { Module } from '@nestjs/common';
import { ServiceApiKeyGuard } from '../../../shared/guards/service-api-key.guard';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { FindOrCreateCustomerByPhoneUseCase } from '../application/find-or-create-customer-by-phone.use-case';
import { GetUserProfileUseCase } from '../application/get-user-profile.use-case';
import { UpdateUserProfileUseCase } from '../application/update-user-profile.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { WhatsappUsersController } from './whatsapp-users.controller';

@Module({
  controllers: [UsersController, WhatsappUsersController],
  providers: [
    { provide: IUsersRepository, useClass: UsersRepository },
    ServiceApiKeyGuard,
    CreateUserUseCase,
    GetUserProfileUseCase,
    UpdateUserProfileUseCase,
    FindOrCreateCustomerByPhoneUseCase,
  ],
  exports: [
    IUsersRepository,
    CreateUserUseCase,
    GetUserProfileUseCase,
    UpdateUserProfileUseCase,
    FindOrCreateCustomerByPhoneUseCase,
  ],
})
export class UsersModule {}
