import { Module } from '@nestjs/common';
import { GetMeUseCase } from '../application/get-me.use-case';
import { UpdateMeUseCase } from '../application/update-me.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { CreateBarberUseCase } from '../application/create-barber.use-case';
import { GetBarberUseCase } from '../application/get-barber.use-case';
import { ListBarbersUseCase } from '../application/list-barbers.use-case';
import { UpdateBarberUseCase } from '../application/update-barber.use-case';
import { DeleteBarberUseCase } from '../application/delete-barber.use-case';
import { PresignAvatarUseCase } from '../application/presign-avatar.use-case';
import { ConfirmAvatarUseCase } from '../application/confirm-avatar.use-case';
import { UsersRepository } from './users.repository';
import { BarbersRepository } from './barbers.repository';
import { UsersController } from './users.controller';
import { IUsersRepository } from '../domain/users.repository.interface';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { StorageService } from '../../../shared/infrastructure/services/storage.service';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';

@Module({
  controllers: [UsersController],
  providers: [
    { provide: IUsersRepository, useClass: UsersRepository },
    { provide: IBarbersRepository, useClass: BarbersRepository },
    StorageService,
    BcryptService,
    GetMeUseCase,
    UpdateMeUseCase,
    ListUsersUseCase,
    CreateBarberUseCase,
    GetBarberUseCase,
    ListBarbersUseCase,
    UpdateBarberUseCase,
    DeleteBarberUseCase,
    PresignAvatarUseCase,
    ConfirmAvatarUseCase,
  ],
  exports: [IUsersRepository, IBarbersRepository, StorageService, BcryptService],
})
export class UsersModule {}
