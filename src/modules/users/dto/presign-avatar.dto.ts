import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PresignAvatarDto {
  @ApiProperty()
  @IsString()
  mimeType: string;
}
