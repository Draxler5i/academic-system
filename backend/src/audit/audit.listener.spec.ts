import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DomainEventPublisher,
  DomainEventsModule,
} from '../common/domain-event.publisher.js';
import { DomainEvent } from '../common/domain-events.js';
import { AuditModule } from './audit.module.js';

describe('AuditListener', () => {
  it('records the domain events published by the services', async () => {
    const module = await Test.createTestingModule({
      imports: [DomainEventsModule, AuditModule],
    }).compile();
    await module.init();
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    module.get(DomainEventPublisher).publish(DomainEvent.GradeDeleted, {
      entityId: 'grade-1',
      actorId: 'teacher-1',
    });

    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0] as string)).toMatchObject({
      event: 'grade.deleted',
      entityId: 'grade-1',
      actorId: 'teacher-1',
    });
    await module.close();
  });
});
