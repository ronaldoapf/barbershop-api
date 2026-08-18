import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IBarberServicesRepository } from '../../barber-services/domain/barber-services.repository.interface';
import { IServicesRepository } from '../../services/domain/services.repository.interface';
import { GetAvailabilityWindowUseCase } from '../../working-hours/application/get-availability-window.use-case';
import { IAppointmentsRepository } from '../domain/appointments.repository.interface';
import { computeAvailableSlots } from '../domain/slot-calculator.util';

export interface GetAvailableSlotsInput {
  barberId: string;
  serviceIds: string[];
  date: Date;
}

@Injectable()
export class GetAvailableSlotsUseCase {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly servicesRepository: IServicesRepository,
    private readonly barberServicesRepository: IBarberServicesRepository,
    private readonly getAvailabilityWindowUseCase: GetAvailabilityWindowUseCase,
  ) {}

  async execute(input: GetAvailableSlotsInput): Promise<Date[]> {
    const offeredServiceIds =
      await this.barberServicesRepository.listServiceIdsByBarber(
        input.barberId,
      );
    const notOffered = input.serviceIds.filter(
      (id) => !offeredServiceIds.includes(id),
    );
    if (notOffered.length > 0) {
      throw new BadRequestException(
        'Este barbeiro não realiza um ou mais dos serviços solicitados.',
      );
    }

    const services = await Promise.all(
      input.serviceIds.map((id) => this.servicesRepository.findById(id)),
    );
    if (services.some((service) => !service)) {
      throw new NotFoundException('Um ou mais serviços não foram encontrados.');
    }
    const totalDurationMinutes = (
      services as NonNullable<(typeof services)[0]>[]
    ).reduce((sum, service) => sum + service.durationMinutes, 0);

    const window = await this.getAvailabilityWindowUseCase.execute(
      input.barberId,
      input.date,
    );
    if (!window.isWorking) {
      return [];
    }

    const dayStart = new Date(
      Date.UTC(
        input.date.getUTCFullYear(),
        input.date.getUTCMonth(),
        input.date.getUTCDate(),
        0,
        0,
        0,
      ),
    );
    const dayEnd = new Date(
      Date.UTC(
        input.date.getUTCFullYear(),
        input.date.getUTCMonth(),
        input.date.getUTCDate(),
        23,
        59,
        59,
      ),
    );
    const busyAppointments =
      await this.appointmentsRepository.listActiveInRange(
        input.barberId,
        dayStart,
        dayEnd,
      );

    return computeAvailableSlots(
      input.date,
      window,
      busyAppointments.map((appointment) => ({
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
      })),
      totalDurationMinutes,
    );
  }
}
