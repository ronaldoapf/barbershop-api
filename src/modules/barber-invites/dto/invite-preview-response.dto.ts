import { ApiProperty } from '@nestjs/swagger';
import { InvitePreview } from '../application/validate-invite-token.use-case';

export class InvitePreviewResponseDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  expiresAt: Date;

  constructor(preview: InvitePreview) {
    this.name = preview.name;
    this.email = preview.email;
    this.expiresAt = preview.expiresAt;
  }
}
