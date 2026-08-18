import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

const CANCELLABLE_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];
const NOT_FOUND_MESSAGE = 'Agendamento não encontrado.';

@Injectable()
export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(
    requester: UserEntity,
    id: string,
    cancellationReason?: string,
  ): Promise<AppointmentEntity> {
    const appointment = await this.appointmentsRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    await this.assertCanCancel(requester, appointment);

    if (!CANCELLABLE_STATUSES.includes(appointment.status)) {
      throw new ConflictException(
        'Este agendamento não pode mais ser cancelado.',
      );
    }

    return this.appointmentsRepository.cancel(id, {
      cancellationReason,
      cancelledBy: requester.id,
    });
  }

  private async assertCanCancel(
    requester: UserEntity,
    appointment: AppointmentEntity,
  ): Promise<void> {
    if (requester.role === UserRole.OWNER) {
      return;
    }

    if (requester.role === UserRole.CUSTOMER) {
      if (appointment.customerId === requester.id) {
        return;
      }
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    const barber = await this.barbersRepository.findByUserId(requester.id);
    if (barber && barber.id === appointment.barberId) {
      return;
    }
    throw new NotFoundException(NOT_FOUND_MESSAGE);
  }
}
