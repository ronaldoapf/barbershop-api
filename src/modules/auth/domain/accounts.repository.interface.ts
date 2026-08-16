import { AccountEntity } from './account.entity';
import { OAuthProvider } from './oauth-provider.enum';

export interface CreateAccountData {
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
}

export abstract class IAccountsRepository {
  abstract findByProviderAccountId(
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<AccountEntity | null>;
  abstract create(data: CreateAccountData): Promise<AccountEntity>;
}
