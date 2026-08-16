import { Module } from '@nestjs/common';
import { GetBarberUseCase } from '../application/get-barber.use-case';
import { ListBarbersUseCase } from '../application/list-barbers.use-case';
import { UpdateCommissionUseCase } from '../application/update-commission.use-case';
import { IBarbersRepository } from '../domain/barbers.repository.interface';
import { BarbersController } from './barbers.controller';
import { BarbersRepository } from './barbers.repository';

@Module({
  controllers: [BarbersController],
  providers: [
    { provide: IBarbersRepository, useClass: BarbersRepository },
    ListBarbersUseCase,
    GetBarberUseCase,
    UpdateCommissionUseCase,
  ],
  exports: [IBarbersRepository],
})
export class BarbersModule {}
