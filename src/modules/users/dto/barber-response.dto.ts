import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';
import { BarberEntity } from '../domain/barber.entity';

export class BarberResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() commissionPercentage: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: () => UserResponseDto }) user: UserResponseDto;
}

export function toBarberResponseDto(barber: BarberEntity): BarberResponseDto {
  return {
    id: barber.id,
    commissionPercentage: barber.commissionPercentage,
    createdAt: barber.createdAt,
    user: {
      id: barber.user.id,
      name: barber.user.name,
      email: barber.user.email,
      phone: barber.user.phone,
      role: barber.user.role,
      loyaltyPoints: barber.user.loyaltyPoints,
      avatarUrl: barber.user.avatarUrl,
      createdAt: barber.user.createdAt,
    },
  };
}
