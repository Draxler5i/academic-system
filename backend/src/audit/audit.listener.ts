import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '../common/domain-events.js';
import type {
  DomainEventName,
  DomainEventPayload,
} from '../common/domain-events.js';

/** Observer that records every academic change in the audit trail. */
@Injectable()
export class AuditListener {
  private readonly logger = new Logger('Audit');

  @OnEvent(DomainEvent.EnrollmentCreated)
  onEnrollmentCreated(payload: DomainEventPayload) {
    this.record(DomainEvent.EnrollmentCreated, payload);
  }

  @OnEvent(DomainEvent.EnrollmentCancelled)
  onEnrollmentCancelled(payload: DomainEventPayload) {
    this.record(DomainEvent.EnrollmentCancelled, payload);
  }

  @OnEvent(DomainEvent.GradeRecorded)
  onGradeRecorded(payload: DomainEventPayload) {
    this.record(DomainEvent.GradeRecorded, payload);
  }

  @OnEvent(DomainEvent.GradeUpdated)
  onGradeUpdated(payload: DomainEventPayload) {
    this.record(DomainEvent.GradeUpdated, payload);
  }

  @OnEvent(DomainEvent.GradeDeleted)
  onGradeDeleted(payload: DomainEventPayload) {
    this.record(DomainEvent.GradeDeleted, payload);
  }

  private record(event: DomainEventName, payload: DomainEventPayload) {
    this.logger.log(
      JSON.stringify({ event, at: new Date().toISOString(), ...payload }),
    );
  }
}
