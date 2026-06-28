import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import { IAccountsRepository, OAuthProvider } from '../domain/accounts.repository.interface';

@Injectable()
export class AccountsRepository implements IAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { userId: string; provider: OAuthProvider; providerAccountId: string }): Promise<void> {
    await this.prisma.account.create({ data });
  }

  async findByProvider(provider: OAuthProvider, providerAccountId: string): Promise<{ userId: string } | null> {
    return this.prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      select: { userId: true },
    });
  }
}
