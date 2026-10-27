import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { StudentProfilesService } from './student-profiles.service.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

@Module({
  imports: [AuthModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentProfilesService, RolesGuard],
  exports: [StudentProfilesService],
})
export class StudentsModule {}
