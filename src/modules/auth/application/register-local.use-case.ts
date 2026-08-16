import { Injectable } from '@nestjs/common';
import { CreateUserUseCase } from '../../users/application/create-user.use-case';
import { UserRole } from '../../users/domain/user-role.enum';
import { BcryptService } from '../../../shared/infrastructure/services/bcrypt.service';
import {
  IssueTokensService,
  RequestContext,
  TokenPair,
} from './issue-tokens.service';

export interface RegisterLocalInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

@Injectable()
export class RegisterLocalUseCase {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly bcryptService: BcryptService,
    private readonly issueTokensService: IssueTokensService,
  ) {}

  async execute(
    input: RegisterLocalInput,
    context: RequestContext = {},
  ): Promise<TokenPair> {
    const passwordHash = await this.bcryptService.encrypt(input.password);
    const user = await this.createUserUseCase.execute({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: UserRole.CUSTOMER,
    });

    return this.issueTokensService.issue(user, context);
  }
}
