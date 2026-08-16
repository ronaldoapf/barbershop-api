import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IUsersRepository } from '../../users/domain/users.repository.interface';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';
import {
  IssueTokensService,
  RequestContext,
  TokenPair,
} from './issue-tokens.service';

export interface LoginLocalInput {
  email: string;
  password: string;
}

@Injectable()
export class LoginLocalUseCase {
  constructor(
    private readonly usersRepository: IUsersRepository,
    private readonly bcryptService: BcryptService,
    private readonly issueTokensService: IssueTokensService,
  ) {}

  async execute(
    input: LoginLocalInput,
    context: RequestContext = {},
  ): Promise<TokenPair> {
    const user = await this.usersRepository.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const passwordMatches = await this.bcryptService.compare(
      input.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.issueTokensService.issue(user, context);
  }
}
