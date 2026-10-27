import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../auth/auth.types.js';
import type { AuthTokenPayload } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { CreateGradeDto } from './dto/create-grade.dto.js';
import { ListGradeHistoryDto } from './dto/list-grade-history.dto.js';
import { UpdateGradeDto } from './dto/update-grade.dto.js';
import { GradesService } from './grades.service.js';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  findMyHistory(@CurrentUser() user: AuthTokenPayload) {
    return this.gradesService.findMyHistory(user.sub);
  }

  @Get('history')
  @Roles(UserRole.ADMINISTRATOR)
  findAllHistory(@Query() filters: ListGradeHistoryDto) {
    return this.gradesService.findAllHistory(filters);
  }

  @Get('teaching')
  @Roles(UserRole.TEACHER)
  findTeaching(@CurrentUser() user: AuthTokenPayload) {
    return this.gradesService.findTeaching(user.sub);
  }

  @Get('course-offerings/:courseOfferingId')
  @Roles(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  findByCourseOffering(
    @Param('courseOfferingId', ParseUUIDPipe) courseOfferingId: string,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.gradesService.findByCourseOffering(
      courseOfferingId,
      user.sub,
      user.role === UserRole.ADMINISTRATOR,
    );
  }

  @Get('students/:studentId')
  @Roles(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  findStudentHistory(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.gradesService.findStudentHistory(studentId);
  }

  @Post()
  @Roles(UserRole.TEACHER)
  create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateGradeDto) {
    return this.gradesService.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.gradesService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.gradesService.remove(id, user.sub);
  }
}
