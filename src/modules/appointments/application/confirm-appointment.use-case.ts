import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

@Injectable()
export class ConfirmAppointmentUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
  ) {}

  async execute(id: string): Promise<AppointmentEntity> {
    const appointment = await this.appointmentsRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new ConflictException(
        'Somente agendamentos pendentes podem ser confirmados.',
      );
    }

    return this.appointmentsRepository.confirm(id);
  }
}
