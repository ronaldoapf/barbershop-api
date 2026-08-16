import { ApiProperty } from '@nestjs/swagger';
import { TokenPair } from '../application/issue-tokens.service';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  constructor(tokens: TokenPair) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }
}
