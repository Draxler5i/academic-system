import { Injectable } from '@nestjs/common';
import { isPrismaError, PrismaErrorCode } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  enrollmentQuery,
  EnrollmentsRepository,
} from './enrollments.repository.js';
import type { EnrollmentRef, EnrollResult } from './enrollments.repository.js';

/** Thrown inside the transaction to roll it back when the offering is full. */
class NoSeatsAvailable extends Error {}

/** Prisma/PostgreSQL adapter for the enrollments repository port. */
@Injectable()
export class PrismaEnrollmentsRepository extends EnrollmentsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findAll() {
    return this.prisma.enrollment.findMany({
      ...enrollmentQuery,
      orderBy: { enrolledAt: 'desc' },
    });
  }

  findByStudent(studentId: string) {
    return this.prisma.enrollment.findMany({
      where: { studentId },
      ...enrollmentQuery,
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async findOfferingAvailability(courseOfferingId: string) {
    const offering = await this.prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      select: { isActive: true, subject: { select: { isActive: true } } },
    });
    if (!offering) return null;
    return { isOpen: offering.isActive && offering.subject.isActive };
  }

  async exists(studentId: string, courseOfferingId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseOfferingId: { studentId, courseOfferingId } },
      select: { id: true },
    });
    return enrollment !== null;
  }

  async enrollReservingSeat(
    studentId: string,
    courseOfferingId: string,
  ): Promise<EnrollResult> {
    try {
      const enrollment = await this.prisma.$transaction(async (transaction) => {
        // Conditional update: concurrent requests can never exceed the capacity.
        const reserved = await transaction.$executeRaw`
          UPDATE "CourseOffering"
          SET "enrolled" = "enrolled" + 1, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${courseOfferingId}
            AND "isActive" = true
            AND "enrolled" < "capacity"
        `;
        if (reserved !== 1) {
          throw new NoSeatsAvailable();
        }
        return transaction.enrollment.create({
          data: { studentId, courseOfferingId },
          ...enrollmentQuery,
        });
      });
      return { ok: true, enrollment };
    } catch (error) {
      if (error instanceof NoSeatsAvailable) {
        return { ok: false, reason: 'NO_SEATS' };
      }
      if (isPrismaError(error, PrismaErrorCode.UniqueConstraint)) {
        return { ok: false, reason: 'DUPLICATE' };
      }
      throw error;
    }
  }

  async findRef(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      select: {
        id: true,
        courseOfferingId: true,
        student: { select: { userId: true } },
      },
    });
    if (!enrollment) return null;
    return {
      id: enrollment.id,
      courseOfferingId: enrollment.courseOfferingId,
      studentUserId: enrollment.student.userId,
    };
  }

  countGrades(enrollmentId: string) {
    return this.prisma.grade.count({ where: { enrollmentId } });
  }

  async deleteReleasingSeat(enrollment: EnrollmentRef) {
    await this.prisma.$transaction([
      this.prisma.enrollment.delete({ where: { id: enrollment.id } }),
      this.prisma.courseOffering.update({
        where: { id: enrollment.courseOfferingId },
        data: { enrolled: { decrement: 1 } },
      }),
    ]);
  }
}
