import { Module } from '@nestjs/common';
import { AppointmentOwnershipGuard } from '../../../shared/guards/appointment-ownership.guard';
import { BarberServicesModule } from '../../barber-services/infrastructure/barber-services.module';
import { BarbersModule } from '../../barbers/infrastructure/barbers.module';
import { ServicesModule } from '../../services/infrastructure/services.module';
import { SettingsModule } from '../../settings/infrastructure/settings.module';
import { WorkingHoursModule } from '../../working-hours/infrastructure/working-hours.module';
import { CancelAppointmentUseCase } from '../application/cancel-appointment.use-case';
import { CompleteAppointmentUseCase } from '../application/complete-appointment.use-case';
import { ConfirmAppointmentUseCase } from '../application/confirm-appointment.use-case';
import { CreateAppointmentUseCase } from '../application/create-appointment.use-case';
import { GetAppointmentUseCase } from '../application/get-appointment.use-case';
import { GetAvailableSlotsUseCase } from '../application/get-available-slots.use-case';
import { ListAppointmentsUseCase } from '../application/list-appointments.use-case';
import { MarkNoShowUseCase } from '../application/mark-no-show.use-case';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';

@Module({
  imports: [
    BarbersModule,
    ServicesModule,
    BarberServicesModule,
    WorkingHoursModule,
    SettingsModule,
  ],
  controllers: [AppointmentsController],
  providers: [
    { provide: IAppointmentsRepository, useClass: AppointmentsRepository },
    AppointmentOwnershipGuard,
    CreateAppointmentUseCase,
    GetAvailableSlotsUseCase,
    GetAppointmentUseCase,
    ListAppointmentsUseCase,
    ConfirmAppointmentUseCase,
    CancelAppointmentUseCase,
    MarkNoShowUseCase,
    CompleteAppointmentUseCase,
  ],
  exports: [IAppointmentsRepository],
})
export class AppointmentsModule {}
