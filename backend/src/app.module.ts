import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StudentsModule } from './students/students.module.js';
import { SubjectsModule } from './subjects/subjects.module.js';
import { CourseOfferingsModule } from './course-offerings/course-offerings.module.js';
import { EnrollmentsModule } from './enrollments/enrollments.module.js';
import { GradesModule } from './grades/grades.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    StudentsModule,
    SubjectsModule,
    CourseOfferingsModule,
    EnrollmentsModule,
    GradesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
