import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { TokenPayload } from '../interfaces/token-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TokenPayload | null => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { currentUser?: TokenPayload }>();

    return request.currentUser ?? null;
  },
);
