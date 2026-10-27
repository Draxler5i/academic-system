import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListGradeHistoryDto } from './dto/list-grade-history.dto.js';
import {
  activeGradesQuery,
  GradesRepository,
  offeringQuery,
  studentQuery,
} from './grades.repository.js';
import type { GradeChanges, NewGrade } from './grades.repository.js';

/** Prisma/PostgreSQL adapter for the grades repository port. */
@Injectable()
export class PrismaGradesRepository extends GradesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findCoursesTaughtBy(teacherId: string) {
    return this.prisma.courseOffering.findMany({
      where: { teacherId },
      ...offeringQuery,
      orderBy: [{ year: 'desc' }, { period: 'asc' }, { section: 'asc' }],
    });
  }

  findCourseOffering(id: string) {
    return this.prisma.courseOffering.findUnique({ where: { id }, ...offeringQuery });
  }

  findCourseRoster(courseOfferingId: string) {
    return this.prisma.enrollment.findMany({
      where: { courseOfferingId },
      include: { student: studentQuery, grades: activeGradesQuery },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });
  }

  findStudentHistory(studentId: string) {
    return this.prisma.enrollment.findMany({
      where: { studentId },
      include: { courseOffering: offeringQuery, grades: activeGradesQuery },
      orderBy: [
        { courseOffering: { year: 'desc' } },
        { courseOffering: { period: 'asc' } },
      ],
    });
  }

  findHistory(filters: ListGradeHistoryDto) {
    const search = filters.search?.trim();
    return this.prisma.enrollment.findMany({
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
        student: studentQuery,
        courseOffering: offeringQuery,
        grades: activeGradesQuery,
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
  }

  async findCourseTeacherOfEnrollment(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { courseOffering: { select: { teacherId: true } } },
    });
    return enrollment ? enrollment.courseOffering.teacherId : undefined;
  }

  async findActiveGrade(id: string) {
    const grade = await this.prisma.grade.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        enrollmentId: true,
        enrollment: { select: { courseOffering: { select: { teacherId: true } } } },
      },
    });
    if (!grade) return null;
    return {
      id: grade.id,
      enrollmentId: grade.enrollmentId,
      courseTeacherId: grade.enrollment.courseOffering.teacherId,
    };
  }

  async sumActiveWeight(enrollmentId: string, excludedGradeId?: string) {
    const { _sum } = await this.prisma.grade.aggregate({
      where: {
        enrollmentId,
        deletedAt: null,
        ...(excludedGradeId ? { id: { not: excludedGradeId } } : {}),
      },
      _sum: { weight: true },
    });
    return _sum.weight ?? 0;
  }

  create(grade: NewGrade) {
    return this.prisma.grade.create({ data: grade });
  }

  update(id: string, changes: GradeChanges) {
    return this.prisma.grade.update({ where: { id }, data: changes });
  }

  async softDelete(id: string, deletedById: string) {
    await this.prisma.grade.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById },
    });
  }
}
