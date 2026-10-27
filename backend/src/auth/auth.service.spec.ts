import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { UserRole } from './auth.types.js';
import { hash } from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let signAsync: ReturnType<typeof vi.fn>;
  let findUnique: ReturnType<typeof vi.fn>;
  let studentPasswordHash: string;

  beforeEach(async () => {
    signAsync = vi.fn().mockResolvedValue('signed-token');
    findUnique = vi.fn();
    studentPasswordHash = await hash('Estudiante123!', 4);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { signAsync } },
        { provide: PrismaService, useValue: { user: { findUnique } } },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('issues a student token for a valid database account', async () => {
    findUnique.mockResolvedValue({
      id: 'student-001',
      email: 'estudiante@unicen.edu.bo',
      name: 'Estudiante de prueba',
      role: 'STUDENT',
      passwordHash: studentPasswordHash,
    });
    const result = await authService.login(
      'estudiante@unicen.edu.bo',
      'Estudiante123!',
    );

    expect(result).toMatchObject({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: {
        email: 'estudiante@unicen.edu.bo',
        role: UserRole.STUDENT,
      },
    });
    expect(signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.STUDENT, sub: 'student-001' }),
    );
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects invalid credentials', async () => {
    findUnique.mockResolvedValue({
      id: 'student-001',
      email: 'estudiante@unicen.edu.bo',
      name: 'Estudiante de prueba',
      role: 'STUDENT',
      passwordHash: studentPasswordHash,
    });
    await expect(
      authService.login('estudiante@unicen.edu.bo', 'incorrecta'),
    ).rejects.toThrow('Correo o contraseña incorrectos');
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('rejects missing credentials', async () => {
    findUnique.mockResolvedValue(null);
    await expect(authService.login(undefined, undefined)).rejects.toThrow(
      'Correo o contraseña incorrectos',
    );
    expect(signAsync).not.toHaveBeenCalled();
  });
});
