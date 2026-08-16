import { Injectable } from '@nestjs/common';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { UserRole } from '../../users/domain/user-role.enum';
import { IAccountsRepository } from '../domain/accounts.repository.interface';
import { OAuthProvider } from '../domain/oauth-provider.enum';
import {
  IssueTokensService,
  RequestContext,
  TokenPair,
} from './issue-tokens.service';

export interface GoogleProfileInput {
  providerAccountId: string;
  email: string;
  name: string;
}

@Injectable()
export class LoginGoogleUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly accountsRepository: IAccountsRepository,
    private readonly issueTokensService: IssueTokensService,
  ) {}

  async execute(
    profile: GoogleProfileInput,
    context: RequestContext = {},
  ): Promise<TokenPair> {
    const existingAccount =
      await this.accountsRepository.findByProviderAccountId(
        OAuthProvider.GOOGLE,
        profile.providerAccountId,
      );

    if (existingAccount) {
      const user = await this.usersRepository.findById(existingAccount.userId);
      if (user) {
        return this.issueTokensService.issue(user, context);
      }
    }

    let user = await this.usersRepository.findByEmail(profile.email);
    if (!user) {
      user = await this.usersRepository.create({
        name: profile.name,
        email: profile.email,
        role: UserRole.CUSTOMER,
      });
    }

    await this.accountsRepository.create({
      userId: user.id,
      provider: OAuthProvider.GOOGLE,
      providerAccountId: profile.providerAccountId,
    });

    return this.issueTokensService.issue(user, context);
  }
}
