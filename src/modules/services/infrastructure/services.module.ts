import { Module } from '@nestjs/common';
import { CreateServiceUseCase } from '../application/create-service.use-case';
import { DeactivateServiceUseCase } from '../application/deactivate-service.use-case';
import { ListServicesUseCase } from '../application/list-services.use-case';
import { UpdateServiceUseCase } from '../application/update-service.use-case';
import { IServicesRepository } from '../domain/services.repository.interface';
import { ServicesController } from './services.controller';
import { ServicesRepository } from './services.repository';

@Module({
  controllers: [ServicesController],
  providers: [
    { provide: IServicesRepository, useClass: ServicesRepository },
    CreateServiceUseCase,
    UpdateServiceUseCase,
    ListServicesUseCase,
    DeactivateServiceUseCase,
  ],
  exports: [IServicesRepository],
})
export class ServicesModule {}
