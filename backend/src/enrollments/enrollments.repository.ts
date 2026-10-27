import type { Prisma } from '@prisma/client';

export const enrollmentQuery = {
  include: {
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
  },
} satisfies Prisma.EnrollmentDefaultArgs;

export type EnrollmentView = Prisma.EnrollmentGetPayload<typeof enrollmentQuery>;

export interface OfferingAvailability {
  isOpen: boolean;
}

export interface EnrollmentRef {
  id: string;
  courseOfferingId: string;
  studentUserId: string;
}

export type EnrollResult =
  | { ok: true; enrollment: EnrollmentView }
  | { ok: false; reason: 'NO_SEATS' | 'DUPLICATE' };

/** Repository port for enrollments; seat accounting is kept atomic by the adapter. */
export abstract class EnrollmentsRepository {
  abstract findAll(): Promise<EnrollmentView[]>;
  abstract findByStudent(studentId: string): Promise<EnrollmentView[]>;
  abstract findOfferingAvailability(
    courseOfferingId: string,
  ): Promise<OfferingAvailability | null>;
  abstract exists(studentId: string, courseOfferingId: string): Promise<boolean>;
  /** Creates the enrollment and takes a seat in one transaction. */
  abstract enrollReservingSeat(
    studentId: string,
    courseOfferingId: string,
  ): Promise<EnrollResult>;
  abstract findRef(id: string): Promise<EnrollmentRef | null>;
  /** Counts grades including soft-deleted ones. */
  abstract countGrades(enrollmentId: string): Promise<number>;
  /** Deletes the enrollment and frees its seat in one transaction. */
  abstract deleteReleasingSeat(enrollment: EnrollmentRef): Promise<void>;
}
