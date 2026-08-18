import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { IBarbersRepository } from '../../barbers/domain/barbers.repository.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';

const EMPTY_RESULT = (
  page: number,
  limit: number,
): PaginatedResult<AppointmentEntity> => ({
  data: [],
  total: 0,
  page,
  limit,
});

@Injectable()
export class ListAppointmentsUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async execute(
    requester: UserEntity,
    page: number,
    limit: number,
    status?: AppointmentStatus,
  ): Promise<PaginatedResult<AppointmentEntity>> {
    if (requester.role === UserRole.CUSTOMER) {
      return this.appointmentsRepository.list(
        { customerId: requester.id, status },
        page,
        limit,
      );
    }

    if (requester.role === UserRole.BARBER) {
      const barber = await this.barbersRepository.findByUserId(requester.id);
      if (!barber) {
        return EMPTY_RESULT(page, limit);
      }
      return this.appointmentsRepository.list(
        { barberId: barber.id, status },
        page,
        limit,
      );
    }

    return this.appointmentsRepository.list({ status }, page, limit);
  }
}
