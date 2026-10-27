import { Global, Injectable, Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import type { DomainEventName, DomainEventPayload } from './domain-events.js';

/** Subject side of the Observer pattern: services publish, listeners react. */
@Injectable()
export class DomainEventPublisher {
  constructor(private readonly emitter: EventEmitter2) {}

  publish(event: DomainEventName, payload: DomainEventPayload) {
    this.emitter.emit(event, payload);
  }
}

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [DomainEventPublisher],
  exports: [DomainEventPublisher],
})
export class DomainEventsModule {}
