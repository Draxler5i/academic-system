import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthTokenPayload } from '../auth/auth.types.js';

/** Injects the JWT payload that JwtAuthGuard attached to the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthTokenPayload => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: AuthTokenPayload }>();
    return request.user;
  },
);
