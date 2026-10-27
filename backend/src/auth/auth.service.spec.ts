import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { UserRole } from './auth.types.js';

describe('AuthService', () => {
  let authService: AuthService;
  let signAsync: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    signAsync = vi.fn().mockResolvedValue('signed-token');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { signAsync } },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('issues a student token for the demo account', async () => {
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
  });

  it('rejects invalid credentials', async () => {
    await expect(
      authService.login('estudiante@unicen.edu.bo', 'incorrecta'),
    ).rejects.toThrow('Correo o contraseña incorrectos');
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('rejects missing credentials', async () => {
    await expect(authService.login(undefined, undefined)).rejects.toThrow(
      'Correo o contraseña incorrectos',
    );
    expect(signAsync).not.toHaveBeenCalled();
  });
});
