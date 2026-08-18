import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GetSettingUseCase } from '../../settings/application/get-setting.use-case';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentStatus } from '../domain/appointment-status.enum';
import {
  CompleteAppointmentItemInput,
  IAppointmentsRepository,
} from '../domain/appointments.repository.interface';

const COMMISSION_ON_REDEEMED_SERVICE_SETTING_KEY =
  'commission_on_redeemed_service';

@Injectable()
export class CompleteAppointmentUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly getSettingUseCase: GetSettingUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    id: string,
    items: CompleteAppointmentItemInput[],
  ): Promise<AppointmentEntity> {
    const appointment = await this.appointmentsRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictException(
        'Somente agendamentos confirmados podem ser concluídos.',
      );
    }

    const settingRaw = await this.getSettingUseCase.execute(
      COMMISSION_ON_REDEEMED_SERVICE_SETTING_KEY,
    );
    const commissionOnRedeemedService = settingRaw === 'true';

    const completed = await this.appointmentsRepository.complete(
      id,
      items,
      commissionOnRedeemedService,
    );

    this.eventEmitter.emit('appointment.completed', { appointmentId: id });

    return completed;
  }
}
