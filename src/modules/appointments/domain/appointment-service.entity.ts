export class AppointmentServiceEntity {
  id!: string;
  appointmentId!: string;
  serviceId!: string;
  serviceName!: string;
  price!: number;
  durationMinutes!: number;
  pointsEarned!: number;
  redeemedWithPoints!: boolean;
  commissionPercentageApplied!: number | null;
  commissionAmount!: number | null;
  createdAt!: Date;
}
