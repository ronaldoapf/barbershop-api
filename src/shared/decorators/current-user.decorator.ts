import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../../modules/users/domain/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest<{ user: UserEntity }>();
    return request.user;
  },
);
