import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { RegisterLocalUseCase } from '../application/register-local.use-case';
import { LoginLocalUseCase } from '../application/login-local.use-case';
import {
  GoogleProfileInput,
  LoginGoogleUseCase,
} from '../application/login-google.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import {
  RequestContext,
  REFRESH_TOKEN_TTL_MS,
  TokenPair,
} from '../application/issue-tokens.service';
import { ACCESS_TOKEN_TTL_MS } from './jwt-token.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerLocalUseCase: RegisterLocalUseCase,
    private readonly loginLocalUseCase: LoginLocalUseCase,
    private readonly loginGoogleUseCase: LoginGoogleUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const tokens = await this.registerLocalUseCase.execute(
      dto,
      requestContext(req),
    );
    this.setAuthCookies(res, tokens);
    return new AuthResponseDto(tokens);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const tokens = await this.loginLocalUseCase.execute(
      dto,
      requestContext(req),
    );
    this.setAuthCookies(res, tokens);
    return new AuthResponseDto(tokens);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start the Google OAuth flow' })
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 302,
    description:
      'Sets the auth cookies and redirects to the frontend callback page',
  })
  async googleCallback(
    @Req() req: Request & { user: GoogleProfileInput },
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.loginGoogleUseCase.execute(
      req.user,
      requestContext(req),
    );

    this.setAuthCookies(res, tokens);

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    res.redirect(`${frontendUrl}/auth/callback`);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the access/refresh token pair' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const tokens = await this.refreshTokenUseCase.execute(
      this.extractRefreshToken(dto, req),
    );
    this.setAuthCookies(res, tokens);
    return new AuthResponseDto(tokens);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke the session behind the given refresh token',
  })
  @ApiResponse({ status: 204 })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.logoutUseCase.execute(this.extractRefreshToken(dto, req));
    this.clearAuthCookies(res);
  }

  private extractRefreshToken(dto: RefreshTokenDto, req: Request): string {
    const token = dto.refreshToken ?? req.cookies?.refreshToken;
    if (!token) {
      throw new BadRequestException('refreshToken must be a string');
    }
    return token;
  }

  private setAuthCookies(res: Response, tokens: TokenPair): void {
    const secure = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_TTL_MS,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/auth',
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE);
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/auth' });
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
