import { Module } from '@nestjs/common';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { GetUserProfileUseCase } from '../application/get-user-profile.use-case';
import { UpdateUserProfileUseCase } from '../application/update-user-profile.use-case';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';

@Module({
  controllers: [UsersController],
  providers: [
    { provide: IUsersRepository, useClass: UsersRepository },
    CreateUserUseCase,
    GetUserProfileUseCase,
    UpdateUserProfileUseCase,
  ],
  exports: [
    IUsersRepository,
    CreateUserUseCase,
    GetUserProfileUseCase,
    UpdateUserProfileUseCase,
  ],
})
export class UsersModule {}
