import { Module } from '@nestjs/common';
import { BarbersModule } from '../../barbers/infrastructure/barbers.module';
import { ServicesModule } from '../../services/infrastructure/services.module';
import { AssignServiceToBarberUseCase } from '../application/assign-service-to-barber.use-case';
import { ListBarberServicesUseCase } from '../application/list-barber-services.use-case';
import { UnassignServiceFromBarberUseCase } from '../application/unassign-service-from-barber.use-case';
import { IBarberServicesRepository } from '../domain/barber-services.repository.interface';
import { BarberServicesController } from './barber-services.controller';
import { BarberServicesRepository } from './barber-services.repository';

@Module({
  imports: [BarbersModule, ServicesModule],
  controllers: [BarberServicesController],
  providers: [
    { provide: IBarberServicesRepository, useClass: BarberServicesRepository },
    AssignServiceToBarberUseCase,
    UnassignServiceFromBarberUseCase,
    ListBarberServicesUseCase,
  ],
  exports: [IBarberServicesRepository],
})
export class BarberServicesModule {}
