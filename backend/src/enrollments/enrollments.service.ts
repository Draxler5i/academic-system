import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';

const enrollmentInclude = {
  courseOffering: {
    include: {
      subject: true,
      teacher: { select: { id: true, name: true, email: true } },
    },
  },
  student: {
    select: {
      id: true,
      studentCode: true,
      firstName: true,
      lastName: true,
      user: { select: { id: true, email: true } },
    },
  },
} satisfies Prisma.EnrollmentInclude;

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('No existe un perfil de estudiante para esta cuenta');
    }

    return this.prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: enrollmentInclude,
      orderBy: { enrolledAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.enrollment.findMany({
      include: enrollmentInclude,
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateEnrollmentDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('No existe un perfil de estudiante para esta cuenta');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const offering = await transaction.courseOffering.findUnique({
          where: { id: dto.courseOfferingId },
          select: { id: true, isActive: true, subject: { select: { isActive: true } } },
        });
        if (!offering) {
          throw new NotFoundException('Oferta de curso no encontrada');
        }
        if (!offering.isActive || !offering.subject.isActive) {
          throw new ConflictException('La oferta de curso no está disponible');
        }

        const alreadyEnrolled = await transaction.enrollment.findUnique({
          where: {
            studentId_courseOfferingId: {
              studentId: student.id,
              courseOfferingId: dto.courseOfferingId,
            },
          },
          select: { id: true },
        });
        if (alreadyEnrolled) {
          throw new ConflictException(
            'El estudiante ya está inscrito en esta oferta',
          );
        }

        const updated = await transaction.$executeRaw`
          UPDATE "CourseOffering"
          SET "enrolled" = "enrolled" + 1, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${dto.courseOfferingId}
            AND "isActive" = true
            AND "enrolled" < "capacity"
        `;
        if (updated !== 1) {
          throw new ConflictException('La oferta de curso no tiene cupos disponibles');
        }

        return transaction.enrollment.create({
          data: {
            studentId: student.id,
            courseOfferingId: dto.courseOfferingId,
          },
          include: enrollmentInclude,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El estudiante ya está inscrito en esta oferta',
        );
      }
      throw error;
    }
  }

  async remove(id: string, userId: string, isAdministrator: boolean) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      select: {
        id: true,
        courseOfferingId: true,
        student: { select: { userId: true } },
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Inscripción no encontrada');
    }
    if (!isAdministrator && enrollment.student.userId !== userId) {
      throw new ForbiddenException(
        'Solo puedes cancelar tus propias inscripciones',
      );
    }
    // Includes soft-deleted grades: removing the enrollment would erase them for good.
    const gradeCount = await this.prisma.grade.count({ where: { enrollmentId: id } });
    if (gradeCount > 0) {
      throw new ConflictException(
        'No se puede cancelar una inscripción con notas registradas',
      );
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.enrollment.delete({ where: { id } });
      await transaction.courseOffering.update({
        where: { id: enrollment.courseOfferingId },
        data: { enrolled: { decrement: 1 } },
      });
    });

    return { id, deleted: true };
  }
}
