import { compare } from 'bcryptjs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthTokenPayload, AuthUser } from './auth.types.js';
import { UserRole } from './auth.types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(email: unknown, password: unknown) {
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user?.passwordHash || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const roleByDatabaseRole: Record<string, UserRole> = {
      ADMINISTRATOR: UserRole.ADMINISTRATOR,
      TEACHER: UserRole.TEACHER,
      STUDENT: UserRole.STUDENT,
    };
    const role = roleByDatabaseRole[user.role];
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    };
    const payload: AuthTokenPayload = { ...authUser, sub: user.id };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer' as const,
      expiresIn: 3600,
      user: authUser,
    };
  }
}
