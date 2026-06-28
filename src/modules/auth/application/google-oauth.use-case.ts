import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { IAccountsRepository, OAuthProvider } from '../domain/accounts.repository.interface';
import { LoginUseCase } from './login.use-case';

@Injectable()
export class GoogleOAuthUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly accountsRepository: IAccountsRepository,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  async execute(
    profile: { sub: string; email: string; name: string },
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const account = await this.accountsRepository.findByProvider(OAuthProvider.GOOGLE, profile.sub);
    if (account) {
      const user = await this.usersRepository.findById(account.userId);
      if (!user || user.disabledAt) throw new UnauthorizedException('Conta desativada');
      return this.loginUseCase.issueTokens(user.id, user.role, meta);
    }

    let user = await this.usersRepository.findByEmail(profile.email);
    if (!user) {
      user = await this.usersRepository.create({
        name: profile.name,
        email: profile.email,
        phone: null,
        passwordHash: null,
        role: UserRole.CUSTOMER,
      });
    }

    await this.accountsRepository.create({
      userId: user.id,
      provider: OAuthProvider.GOOGLE,
      providerAccountId: profile.sub,
    });

    return this.loginUseCase.issueTokens(user.id, user.role, meta);
  }
}
