import type { Grade, Prisma } from '@prisma/client';
import type { ListGradeHistoryDto } from './dto/list-grade-history.dto.js';

export const activeGradesQuery = {
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

export const offeringQuery = {
  include: {
    subject: true,
    teacher: { select: { id: true, name: true, email: true } },
  },
} satisfies Prisma.CourseOfferingDefaultArgs;

export const studentQuery = {
  select: {
    id: true,
    studentCode: true,
    firstName: true,
    lastName: true,
    user: { select: { email: true } },
  },
} satisfies Prisma.StudentDefaultArgs;

export type CourseOfferingView = Prisma.CourseOfferingGetPayload<typeof offeringQuery>;

export type RosterEnrollment = Prisma.EnrollmentGetPayload<{
  include: { student: typeof studentQuery; grades: typeof activeGradesQuery };
}>;

export type HistoryEnrollment = Prisma.EnrollmentGetPayload<{
  include: { courseOffering: typeof offeringQuery; grades: typeof activeGradesQuery };
}>;

export type StudentHistoryEnrollment = HistoryEnrollment & RosterEnrollment;

export interface ActiveGradeRef {
  id: string;
  enrollmentId: string;
  courseTeacherId: string | null;
}

export interface NewGrade {
  enrollmentId: string;
  title: string;
  score: number;
  weight: number;
  comment: string | null;
  recordedById: string;
}

export type GradeChanges = Partial<Omit<NewGrade, 'enrollmentId'>>;

/**
 * Repository port for grades: the service depends on this contract, not on Prisma.
 * Every read returns only active (not soft-deleted) grades.
 */
export abstract class GradesRepository {
  abstract findCoursesTaughtBy(teacherId: string): Promise<CourseOfferingView[]>;
  abstract findCourseOffering(id: string): Promise<CourseOfferingView | null>;
  abstract findCourseRoster(courseOfferingId: string): Promise<RosterEnrollment[]>;
  abstract findStudentHistory(studentId: string): Promise<HistoryEnrollment[]>;
  abstract findHistory(filters: ListGradeHistoryDto): Promise<StudentHistoryEnrollment[]>;
  /** Returns undefined when the enrollment does not exist. */
  abstract findCourseTeacherOfEnrollment(
    enrollmentId: string,
  ): Promise<string | null | undefined>;
  abstract findActiveGrade(id: string): Promise<ActiveGradeRef | null>;
  abstract sumActiveWeight(enrollmentId: string, excludedGradeId?: string): Promise<number>;
  abstract create(grade: NewGrade): Promise<Grade>;
  abstract update(id: string, changes: GradeChanges): Promise<Grade>;
  abstract softDelete(id: string, deletedById: string): Promise<void>;
}
