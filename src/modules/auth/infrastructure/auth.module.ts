import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RegisterUseCase } from '../application/register.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { RefreshTokenUseCase } from '../application/refresh-token.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { GoogleOAuthUseCase } from '../application/google-oauth.use-case';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { SessionsRepository } from './sessions.repository';
import { AccountsRepository } from './accounts.repository';
import { AuthController } from './auth.controller';
import { ISessionsRepository } from '../domain/sessions.repository.interface';
import { IAccountsRepository } from '../domain/accounts.repository.interface';
import { UsersModule } from '../../users/infrastructure/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GoogleOAuthUseCase,
    JwtStrategy,
    GoogleStrategy,
    { provide: ISessionsRepository, useClass: SessionsRepository },
    { provide: IAccountsRepository, useClass: AccountsRepository },
  ],
})
export class AuthModule {}
