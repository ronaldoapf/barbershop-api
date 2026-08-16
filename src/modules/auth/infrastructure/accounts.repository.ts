import { Injectable } from '@nestjs/common';
import { Account } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma.service';
import {
  CreateAccountData,
  IAccountsRepository,
} from '../domain/accounts.repository.interface';
import { AccountEntity } from '../domain/account.entity';
import { OAuthProvider } from '../domain/oauth-provider.enum';

@Injectable()
export class AccountsRepository implements IAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProviderAccountId(
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<AccountEntity | null> {
    const record = await this.prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    });
    return record ? this.toEntity(record) : null;
  }

  async create(data: CreateAccountData): Promise<AccountEntity> {
    const record = await this.prisma.account.create({ data });
    return this.toEntity(record);
  }

  private toEntity(record: Account): AccountEntity {
    return {
      id: record.id,
      userId: record.userId,
      provider: record.provider as OAuthProvider,
      providerAccountId: record.providerAccountId,
      createdAt: record.createdAt,
    };
  }
}
