import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../../modules/users/domain/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): { id: string; role: string } => {
    const request = ctx.switchToHttp().getRequest<{ user: { id: string; role: string } }>();
    return request.user;
  },
);
