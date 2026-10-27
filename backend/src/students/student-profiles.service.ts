import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/** Resolves the student profile behind an authenticated account or an id. */
@Injectable()
export class StudentProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getIdByUserId(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException(
        'No existe un perfil de estudiante para esta cuenta',
      );
    }
    return student.id;
  }

  async assertExists(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
  }
}
