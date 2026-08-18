import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { AppointmentEntity } from './appointment.entity';
import { AppointmentSource } from './appointment-source.enum';
import { AppointmentStatus } from './appointment-status.enum';

export interface CreateAppointmentServiceInput {
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  pointsEarned: number;
}

export interface CreateAppointmentData {
  customerId: string;
  barberId: string;
  startsAt: Date;
  endsAt: Date;
  totalAmount: number;
  source: AppointmentSource;
  services: CreateAppointmentServiceInput[];
}

export interface ListAppointmentsFilter {
  customerId?: string;
  barberId?: string;
  status?: AppointmentStatus;
}

export interface CancelAppointmentData {
  cancellationReason?: string;
  cancelledBy: string;
}

export interface CompleteAppointmentItemInput {
  appointmentServiceId: string;
  redeemedWithPoints: boolean;
}

export abstract class IAppointmentsRepository {
  abstract createWithConflictCheck(
    data: CreateAppointmentData,
  ): Promise<AppointmentEntity>;
  abstract findById(id: string): Promise<AppointmentEntity | null>;
  abstract list(
    filter: ListAppointmentsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AppointmentEntity>>;
  abstract listActiveInRange(
    barberId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AppointmentEntity[]>;
  abstract confirm(id: string): Promise<AppointmentEntity>;
  abstract markNoShow(id: string): Promise<AppointmentEntity>;
  abstract cancel(
    id: string,
    data: CancelAppointmentData,
  ): Promise<AppointmentEntity>;
  abstract complete(
    id: string,
    items: CompleteAppointmentItemInput[],
    commissionOnRedeemedService: boolean,
  ): Promise<AppointmentEntity>;
}
