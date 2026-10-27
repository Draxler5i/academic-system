import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthTokenPayload, UserRole } from './auth.types.js';

type AuthenticatedRequest = Request & { user?: AuthTokenPayload };

const roles = new Set<string>(Object.values(UserRole));

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      throw new UnauthorizedException('Se requiere un token Bearer');
    }

    let payload: AuthTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AuthTokenPayload>(match[1]);
    } catch {
      throw new UnauthorizedException('El token no es válido o ha expirado');
    }

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string' ||
      !roles.has(payload.role)
    ) {
      throw new UnauthorizedException('El token no es válido');
    }

    request.user = payload;
    return true;
  }
}
