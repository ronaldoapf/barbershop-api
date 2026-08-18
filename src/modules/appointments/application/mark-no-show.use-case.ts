import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

const NO_SHOW_ELIGIBLE_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

@Injectable()
export class MarkNoShowUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
  ) {}

  async execute(id: string): Promise<AppointmentEntity> {
    const appointment = await this.appointmentsRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    if (!NO_SHOW_ELIGIBLE_STATUSES.includes(appointment.status)) {
      throw new ConflictException(
        'Este agendamento não pode ser marcado como não compareceu.',
      );
    }

    return this.appointmentsRepository.markNoShow(id);
  }
}
