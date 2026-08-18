import { Injectable, NotFoundException } from '@nestjs/common';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { AppointmentEntity } from '../domain/appointment.entity';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

const NOT_FOUND_MESSAGE = 'Agendamento não encontrado.';

@Injectable()
export class GetAppointmentUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(requester: UserEntity, id: string): Promise<AppointmentEntity> {
    const appointment = await this.appointmentsRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    if (requester.role === UserRole.OWNER) {
      return appointment;
    }

    if (requester.role === UserRole.CUSTOMER) {
      if (appointment.customerId !== requester.id) {
        throw new NotFoundException(NOT_FOUND_MESSAGE);
      }
      return appointment;
    }

    const barber = await this.barbersRepository.findByUserId(requester.id);
    if (!barber || barber.id !== appointment.barberId) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return appointment;
  }
}
