import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../../users/infrastructure/users.module';
import { IssueTokensService } from '../application/issue-tokens.service';
import { LoginGoogleUseCase } from '../application/login-google.use-case';
import { LoginLocalUseCase } from '../application/login-local.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { RegisterLocalUseCase } from '../application/register-local.use-case';
import { IAccountsRepository } from '../domain/accounts.repository.interface';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { ITokenService } from '../domain/token.service.interface';
import { AccountsRepository } from './accounts.repository';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { JwtTokenService } from './jwt-token.service';
import { SessionsRepository } from './sessions.repository';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    { provide: ISessionsRepository, useClass: SessionsRepository },
    { provide: IAccountsRepository, useClass: AccountsRepository },
    { provide: ITokenService, useClass: JwtTokenService },
    IssueTokensService,
    RegisterLocalUseCase,
    LoginLocalUseCase,
    LoginGoogleUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    JwtStrategy,
    GoogleStrategy,
  ],
})
export class AuthModule {}
