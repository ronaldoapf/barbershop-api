import { AppointmentServiceEntity } from './appointment-service.entity';
import { AppointmentSource } from './appointment-source.enum';
import { AppointmentStatus } from './appointment-status.enum';

export class AppointmentEntity {
  id!: string;
  customerId!: string;
  barberId!: string;
  startsAt!: Date;
  endsAt!: Date;
  totalAmount!: number;
  status!: AppointmentStatus;
  source!: AppointmentSource;
  cancellationReason!: string | null;
  cancelledBy!: string | null;
  cancelledAt!: Date | null;
  createdAt!: Date;
  disabledAt!: Date | null;
  services!: AppointmentServiceEntity[];
}
