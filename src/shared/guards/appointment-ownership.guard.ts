import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { IAppointmentsRepository } from '../../modules/appointments/domain/appointments.repository.interface';
import { IBarbersRepository } from '../../modules/barbers/domain/barbers.repository.interface';
import { UserEntity } from '../../modules/users/domain/user.entity';
import { UserRole } from '../../modules/users/domain/user-role.enum';

@Injectable()
export class AppointmentOwnershipGuard implements CanActivate {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly barbersRepository: IBarbersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: UserEntity; params: Record<string, string> }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.role === UserRole.OWNER) {
      return true;
    }

    const appointment = await this.appointmentsRepository.findById(
      request.params.id,
    );
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    const barber = await this.barbersRepository.findByUserId(user.id);
    if (!barber || barber.id !== appointment.barberId) {
      throw new ForbiddenException(
        'Você não tem permissão para gerenciar este agendamento.',
      );
    }

    return true;
  }
}
