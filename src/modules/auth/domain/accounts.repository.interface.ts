export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
}

export abstract class IAccountsRepository {
  abstract create(data: { userId: string; provider: OAuthProvider; providerAccountId: string }): Promise<void>;
  abstract findByProvider(provider: OAuthProvider, providerAccountId: string): Promise<{ userId: string } | null>;
}
