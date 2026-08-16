import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiPropertyOptional({
    minLength: 8,
    description:
      'Obrigatório apenas se o usuário convidado ainda não possui senha.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
