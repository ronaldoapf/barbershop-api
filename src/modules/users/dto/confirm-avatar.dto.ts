import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmAvatarDto {
  @ApiProperty() @IsString() storageKey: string;
  @ApiProperty() @IsString() mimeType: string;
}
