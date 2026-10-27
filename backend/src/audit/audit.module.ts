import { Module } from '@nestjs/common';
import { AuditListener } from './audit.listener.js';

@Module({
  providers: [AuditListener],
})
export class AuditModule {}
