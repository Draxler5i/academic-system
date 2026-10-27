import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module.js';
import { StudentsModule } from '../students/students.module.js';
import { GradesController } from './grades.controller.js';
import { GradesRepository } from './grades.repository.js';
import { GradesService } from './grades.service.js';
import { GradingPolicy } from './grading/grading-policy.js';
import { createGradingPolicy } from './grading/grading-policy.factory.js';
import { PrismaGradesRepository } from './prisma-grades.repository.js';

@Module({
  imports: [AuthModule, StudentsModule],
  controllers: [GradesController],
  providers: [
    GradesService,
    { provide: GradesRepository, useClass: PrismaGradesRepository },
    {
      provide: GradingPolicy,
      inject: [ConfigService],
      useFactory: createGradingPolicy,
    },
  ],
})
export class GradesModule {}
