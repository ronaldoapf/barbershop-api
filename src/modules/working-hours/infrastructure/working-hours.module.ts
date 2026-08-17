import { Module } from '@nestjs/common';
import { BarbersModule } from '../../barbers/infrastructure/barbers.module';
import { GetAvailabilityWindowUseCase } from '../application/get-availability-window.use-case';
import { ListWorkingHoursUseCase } from '../application/list-working-hours.use-case';
import { SetDateExceptionUseCase } from '../application/set-date-exception.use-case';
import { SetWeeklyHoursUseCase } from '../application/set-weekly-hours.use-case';
import { IWorkingHoursRepository } from '../domain/working-hours.repository.interface';
import { WorkingHoursController } from './working-hours.controller';
import { WorkingHoursRepository } from './working-hours.repository';

@Module({
  imports: [BarbersModule],
  controllers: [WorkingHoursController],
  providers: [
    { provide: IWorkingHoursRepository, useClass: WorkingHoursRepository },
    SetWeeklyHoursUseCase,
    SetDateExceptionUseCase,
    ListWorkingHoursUseCase,
    GetAvailabilityWindowUseCase,
  ],
  exports: [IWorkingHoursRepository, GetAvailabilityWindowUseCase],
})
export class WorkingHoursModule {}
