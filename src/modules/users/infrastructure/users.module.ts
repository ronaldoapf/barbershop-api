import { Module } from '@nestjs/common';
import { IUsersRepository } from '../domain/users.repository.interface';
import { UsersRepository } from './users.repository';

@Module({
  providers: [{ provide: IUsersRepository, useClass: UsersRepository }],
  exports: [IUsersRepository],
})
export class UsersModule {}
