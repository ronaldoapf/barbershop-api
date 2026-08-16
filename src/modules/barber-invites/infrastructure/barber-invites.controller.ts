import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BarberResponseDto } from '../../barbers/dto/barber-response.dto';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { AcceptInviteUseCase } from '../application/accept-invite.use-case';
import { ResendInviteUseCase } from '../application/resend-invite.use-case';
import { SendInviteUseCase } from '../application/send-invite.use-case';
import { ValidateInviteTokenUseCase } from '../application/validate-invite-token.use-case';
import { AcceptInviteDto } from '../dto/accept-invite.dto';
import { BarberInviteResponseDto } from '../dto/barber-invite-response.dto';
import { InvitePreviewResponseDto } from '../dto/invite-preview-response.dto';
import { SendInviteDto } from '../dto/send-invite.dto';

@ApiTags('invites')
@Controller('invites')
export class BarberInvitesController {
  constructor(
    private readonly sendInviteUseCase: SendInviteUseCase,
    private readonly validateInviteTokenUseCase: ValidateInviteTokenUseCase,
    private readonly acceptInviteUseCase: AcceptInviteUseCase,
    private readonly resendInviteUseCase: ResendInviteUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Send a barber invite by email' })
  @ApiResponse({ status: 201, type: BarberInviteResponseDto })
  async send(@Body() dto: SendInviteDto): Promise<BarberInviteResponseDto> {
    const invite = await this.sendInviteUseCase.execute(dto);
    return new BarberInviteResponseDto(invite);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Validate an invite token from the emailed link' })
  @ApiResponse({ status: 200, type: InvitePreviewResponseDto })
  async validate(
    @Param('token') token: string,
  ): Promise<InvitePreviewResponseDto> {
    const preview = await this.validateInviteTokenUseCase.execute(token);
    return new InvitePreviewResponseDto(preview);
  }

  @Post(':token/accept')
  @ApiOperation({ summary: 'Accept a barber invite and activate the account' })
  @ApiResponse({ status: 201, type: BarberResponseDto })
  async accept(
    @Param('token') token: string,
    @Body() dto: AcceptInviteDto,
  ): Promise<BarberResponseDto> {
    const barber = await this.acceptInviteUseCase.execute({
      token,
      password: dto.password,
    });
    return new BarberResponseDto(barber);
  }

  @Post(':id/resend')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Resend a pending barber invite' })
  @ApiResponse({ status: 204 })
  async resend(@Param('id') id: string): Promise<void> {
    await this.resendInviteUseCase.execute(id);
  }
}
