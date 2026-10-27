import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { StudentsModule } from '../students/students.module.js';
import { EnrollmentsController } from './enrollments.controller.js';
import { EnrollmentsRepository } from './enrollments.repository.js';
import { EnrollmentsService } from './enrollments.service.js';
import { PrismaEnrollmentsRepository } from './prisma-enrollments.repository.js';

@Module({
  imports: [AuthModule, StudentsModule],
  controllers: [EnrollmentsController],
  providers: [
    EnrollmentsService,
    { provide: EnrollmentsRepository, useClass: PrismaEnrollmentsRepository },
  ],
})
export class EnrollmentsModule {}
