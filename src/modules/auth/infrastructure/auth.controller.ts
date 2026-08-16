import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RegisterLocalUseCase } from '../application/register-local.use-case';
import { LoginLocalUseCase } from '../application/login-local.use-case';
import {
  GoogleProfileInput,
  LoginGoogleUseCase,
} from '../application/login-google.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { RequestContext } from '../application/issue-tokens.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerLocalUseCase: RegisterLocalUseCase,
    private readonly loginLocalUseCase: LoginLocalUseCase,
    private readonly loginGoogleUseCase: LoginGoogleUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const tokens = await this.registerLocalUseCase.execute(
      dto,
      requestContext(req),
    );
    return new AuthResponseDto(tokens);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const tokens = await this.loginLocalUseCase.execute(
      dto,
      requestContext(req),
    );
    return new AuthResponseDto(tokens);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start the Google OAuth flow' })
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async googleCallback(
    @Req() req: Request & { user: GoogleProfileInput },
  ): Promise<AuthResponseDto> {
    const tokens = await this.loginGoogleUseCase.execute(
      req.user,
      requestContext(req),
    );
    return new AuthResponseDto(tokens);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the access/refresh token pair' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const tokens = await this.refreshTokenUseCase.execute(dto.refreshToken);
    return new AuthResponseDto(tokens);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke the session behind the given refresh token',
  })
  @ApiResponse({ status: 204 })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.logoutUseCase.execute(dto.refreshToken);
  }
}

function requestContext(req: Request): RequestContext {
  const userAgentHeader = req.headers['user-agent'] as
    string | string[] | undefined;
  return {
    userAgent: Array.isArray(userAgentHeader)
      ? userAgentHeader[0]
      : userAgentHeader,
    ipAddress: req.ip,
  };
}
