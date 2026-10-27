import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateGradeDto } from './dto/create-grade.dto.js';
import { ListGradeHistoryDto } from './dto/list-grade-history.dto.js';
import { UpdateGradeDto } from './dto/update-grade.dto.js';
import { summarizeGrades } from './grade-summary.js';

const activeGrades = {
  where: { deletedAt: null },
  orderBy: { createdAt: 'asc' },
  select: {
    id: true,
    title: true,
    score: true,
    weight: true,
    comment: true,
    createdAt: true,
    updatedAt: true,
    recordedBy: { select: { id: true, name: true } },
  },
} satisfies Prisma.Enrollment$gradesArgs;

const offeringSummary = {
  include: {
    subject: true,
    teacher: { select: { id: true, name: true, email: true } },
  },
} satisfies Prisma.CourseOfferingDefaultArgs;

const studentSummary = {
  select: {
    id: true,
    studentCode: true,
    firstName: true,
    lastName: true,
    user: { select: { email: true } },
  },
} satisfies Prisma.StudentDefaultArgs;

const gradeWithEnrollment = {
  include: {
    enrollment: {
      select: {
        id: true,
        courseOffering: { select: { id: true, teacherId: true } },
      },
    },
  },
} satisfies Prisma.GradeDefaultArgs;

type GradedEnrollment = { grades: { score: number; weight: number }[] };

function withSummary<T extends GradedEnrollment>(enrollment: T) {
  return { ...enrollment, summary: summarizeGrades(enrollment.grades) };
}

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  findTeaching(teacherId: string) {
    return this.prisma.courseOffering.findMany({
      where: { teacherId },
      ...offeringSummary,
      orderBy: [{ year: 'desc' }, { period: 'asc' }, { section: 'asc' }],
    });
  }

  async findByCourseOffering(
    courseOfferingId: string,
    userId: string,
    isAdministrator: boolean,
  ) {
    const offering = await this.prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      ...offeringSummary,
    });
    if (!offering) {
      throw new NotFoundException('Oferta de curso no encontrada');
    }
    if (!isAdministrator && offering.teacherId !== userId) {
      throw new ForbiddenException(
        'Solo puedes consultar las notas de los cursos que dictas',
      );
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseOfferingId },
      include: { student: studentSummary, grades: activeGrades },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });

    return { offering, enrollments: enrollments.map(withSummary) };
  }

  async findMyHistory(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('No existe un perfil de estudiante para esta cuenta');
    }
    return this.findHistory(student.id);
  }

  async findStudentHistory(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    return this.findHistory(student.id);
  }

  async findAllHistory(filters: ListGradeHistoryDto) {
    const search = filters.search?.trim();
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseOfferingId: filters.courseOfferingId,
        courseOffering: {
          year: filters.year,
          period: filters.period,
          subjectId: filters.subjectId,
        },
        ...(search
          ? {
              student: {
                OR: [
                  { studentCode: { contains: search, mode: 'insensitive' } },
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: {
        student: studentSummary,
        courseOffering: offeringSummary,
        grades: activeGrades,
      },
      orderBy: [
        { courseOffering: { year: 'desc' } },
        { courseOffering: { period: 'asc' } },
        { courseOffering: { subject: { code: 'asc' } } },
        { courseOffering: { section: 'asc' } },
        { student: { lastName: 'asc' } },
        { student: { firstName: 'asc' } },
      ],
    });
    return enrollments.map(withSummary);
  }

  async create(teacherId: string, dto: CreateGradeDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      select: { id: true, courseOffering: { select: { teacherId: true } } },
    });
    if (!enrollment) {
      throw new NotFoundException('Inscripción no encontrada');
    }
    this.assertTeaches(enrollment.courseOffering.teacherId, teacherId);
    await this.assertWeightAvailable(enrollment.id, dto.weight);

    return this.prisma.grade.create({
      data: {
        enrollmentId: enrollment.id,
        title: dto.title.trim(),
        score: dto.score,
        weight: dto.weight,
        comment: dto.comment?.trim() || null,
        recordedById: teacherId,
      },
    });
  }

  async update(id: string, teacherId: string, dto: UpdateGradeDto) {
    const grade = await this.findActiveGrade(id);
    this.assertTeaches(grade.enrollment.courseOffering.teacherId, teacherId);
    if (dto.weight !== undefined) {
      await this.assertWeightAvailable(grade.enrollmentId, dto.weight, grade.id);
    }

    return this.prisma.grade.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        score: dto.score,
        weight: dto.weight,
        comment: dto.comment === undefined ? undefined : dto.comment.trim() || null,
        recordedById: teacherId,
      },
    });
  }

  async remove(id: string, teacherId: string) {
    const grade = await this.findActiveGrade(id);
    this.assertTeaches(grade.enrollment.courseOffering.teacherId, teacherId);

    await this.prisma.grade.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: teacherId },
    });
    return { id, deleted: true };
  }

  private async findHistory(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      include: { courseOffering: offeringSummary, grades: activeGrades },
      orderBy: [
        { courseOffering: { year: 'desc' } },
        { courseOffering: { period: 'asc' } },
      ],
    });
    return enrollments.map(withSummary);
  }

  private async findActiveGrade(id: string) {
    const grade = await this.prisma.grade.findFirst({
      where: { id, deletedAt: null },
      ...gradeWithEnrollment,
    });
    if (!grade) {
      throw new NotFoundException('Nota no encontrada');
    }
    return grade;
  }

  private assertTeaches(courseTeacherId: string | null, teacherId: string) {
    if (courseTeacherId !== teacherId) {
      throw new ForbiddenException(
        'Solo puedes gestionar notas de los cursos que dictas',
      );
    }
  }

  private async assertWeightAvailable(
    enrollmentId: string,
    weight: number,
    excludedGradeId?: string,
  ) {
    const { _sum } = await this.prisma.grade.aggregate({
      where: {
        enrollmentId,
        deletedAt: null,
        ...(excludedGradeId ? { id: { not: excludedGradeId } } : {}),
      },
      _sum: { weight: true },
    });
    const usedWeight = _sum.weight ?? 0;
    if (usedWeight + weight > 100) {
      throw new BadRequestException(
        `La ponderación supera el 100 %. Disponible: ${100 - usedWeight} %`,
      );
    }
  }
}
