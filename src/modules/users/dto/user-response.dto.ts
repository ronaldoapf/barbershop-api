import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../domain/user-role.enum';
import { UserEntity } from '../domain/user.entity';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() phone: string | null;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() loyaltyPoints: number;
  @ApiPropertyOptional() avatarUrl: string | null;
  @ApiProperty() createdAt: Date;
}

export function toUserResponseDto(user: UserEntity): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    loyaltyPoints: user.loyaltyPoints,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}
