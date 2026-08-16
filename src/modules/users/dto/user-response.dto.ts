import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserEntity } from '../domain/user.entity';
import { UserRole } from '../domain/user-role.enum';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  loyaltyPoints: number;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty()
  createdAt: Date;

  constructor(entity: UserEntity) {
    this.id = entity.id;
    this.name = entity.name;
    this.email = entity.email;
    this.phone = entity.phone;
    this.role = entity.role;
    this.loyaltyPoints = entity.loyaltyPoints;
    this.avatarUrl = entity.avatarUrl;
    this.createdAt = entity.createdAt;
  }
}
