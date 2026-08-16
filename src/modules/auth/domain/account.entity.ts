import { OAuthProvider } from './oauth-provider.enum';

export class AccountEntity {
  id!: string;
  userId!: string;
  provider!: OAuthProvider;
  providerAccountId!: string;
  createdAt!: Date;
}
