/**
 * Domain events published by the application services (Observer pattern).
 * Publishers do not know who listens; listeners such as the audit log subscribe
 * without the services having to change.
 */
export const DomainEvent = {
  EnrollmentCreated: 'enrollment.created',
  EnrollmentCancelled: 'enrollment.cancelled',
  GradeRecorded: 'grade.recorded',
  GradeUpdated: 'grade.updated',
  GradeDeleted: 'grade.deleted',
} as const;

export type DomainEventName = (typeof DomainEvent)[keyof typeof DomainEvent];

export interface DomainEventPayload {
  entityId: string;
  actorId: string;
  details?: Record<string, unknown>;
}
