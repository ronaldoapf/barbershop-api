import { ApiProperty } from '@nestjs/swagger';

export class PresignAvatarResponseDto {
  @ApiProperty() url: string;
  @ApiProperty() key: string;
}
