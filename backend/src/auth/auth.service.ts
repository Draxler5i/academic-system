import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokenPayload, AuthUser } from './auth.types.js';
import { UserRole } from './auth.types.js';

const DEMO_STUDENT = {
  email: 'estudiante@unicen.edu.bo',
  password: 'Estudiante123!',
  user: {
    id: 'student-001',
    email: 'estudiante@unicen.edu.bo',
    name: 'Estudiante de prueba',
    role: UserRole.STUDENT,
  } satisfies AuthUser,
};

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(email: unknown, password: unknown) {
    if (
      typeof email !== 'string' ||
      email.trim().toLowerCase() !== DEMO_STUDENT.email ||
      typeof password !== 'string' ||
      password !== DEMO_STUDENT.password
    ) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const payload: AuthTokenPayload = {
      ...DEMO_STUDENT.user,
      sub: DEMO_STUDENT.user.id,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer' as const,
      expiresIn: 3600,
      user: DEMO_STUDENT.user,
    };
  }
}
