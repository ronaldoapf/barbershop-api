import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentEntity } from '../domain/appointment.entity';
import { AppointmentServiceEntity } from '../domain/appointment-service.entity';
import { AppointmentSource } from '../domain/appointment-source.enum';
import { AppointmentStatus } from '../domain/appointment-status.enum';

export class AppointmentServiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  serviceId: string;

  @ApiProperty()
  serviceName: string;

  @ApiProperty({ description: 'Price in cents' })
  price: number;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty()
  pointsEarned: number;

  @ApiProperty()
  redeemedWithPoints: boolean;

  @ApiPropertyOptional({ nullable: true })
  commissionPercentageApplied: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Commission in cents' })
  commissionAmount: number | null;

  constructor(entity: AppointmentServiceEntity) {
    this.id = entity.id;
    this.serviceId = entity.serviceId;
    this.serviceName = entity.serviceName;
    this.price = entity.price;
    this.durationMinutes = entity.durationMinutes;
    this.pointsEarned = entity.pointsEarned;
    this.redeemedWithPoints = entity.redeemedWithPoints;
    this.commissionPercentageApplied = entity.commissionPercentageApplied;
    this.commissionAmount = entity.commissionAmount;
  }
}

export class AppointmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  barberId: string;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty({ description: 'Total in cents' })
  totalAmount: number;

  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiProperty({ enum: AppointmentSource })
  source: AppointmentSource;

  @ApiPropertyOptional({ nullable: true })
  cancellationReason: string | null;

  @ApiPropertyOptional({ nullable: true })
  cancelledBy: string | null;

  @ApiPropertyOptional({ nullable: true })
  cancelledAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [AppointmentServiceResponseDto] })
  services: AppointmentServiceResponseDto[];

  constructor(entity: AppointmentEntity) {
    this.id = entity.id;
    this.customerId = entity.customerId;
    this.barberId = entity.barberId;
    this.startsAt = entity.startsAt;
    this.endsAt = entity.endsAt;
    this.totalAmount = entity.totalAmount;
    this.status = entity.status;
    this.source = entity.source;
    this.cancellationReason = entity.cancellationReason;
    this.cancelledBy = entity.cancelledBy;
    this.cancelledAt = entity.cancelledAt;
    this.createdAt = entity.createdAt;
    this.services = entity.services.map(
      (service) => new AppointmentServiceResponseDto(service),
    );
  }
}
