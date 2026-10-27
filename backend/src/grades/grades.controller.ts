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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthTokenPayload, UserRole } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateGradeDto } from './dto/create-grade.dto.js';
import { ListGradeHistoryDto } from './dto/list-grade-history.dto.js';
import { UpdateGradeDto } from './dto/update-grade.dto.js';
import { GradesService } from './grades.service.js';

type AuthenticatedRequest = Request & { user: AuthTokenPayload };

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  findMyHistory(@Req() request: AuthenticatedRequest) {
    return this.gradesService.findMyHistory(request.user.sub);
  }

  @Get('history')
  @Roles(UserRole.ADMINISTRATOR)
  findAllHistory(@Query() filters: ListGradeHistoryDto) {
    return this.gradesService.findAllHistory(filters);
  }

  @Get('teaching')
  @Roles(UserRole.TEACHER)
  findTeaching(@Req() request: AuthenticatedRequest) {
    return this.gradesService.findTeaching(request.user.sub);
  }

  @Get('course-offerings/:courseOfferingId')
  @Roles(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  findByCourseOffering(
    @Param('courseOfferingId', ParseUUIDPipe) courseOfferingId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.gradesService.findByCourseOffering(
      courseOfferingId,
      request.user.sub,
      request.user.role === UserRole.ADMINISTRATOR,
    );
  }

  @Get('students/:studentId')
  @Roles(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  findStudentHistory(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.gradesService.findStudentHistory(studentId);
  }

  @Post()
  @Roles(UserRole.TEACHER)
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateGradeDto) {
    return this.gradesService.create(request.user.sub, dto);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.gradesService.update(id, request.user.sub, dto);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.gradesService.remove(id, request.user.sub);
  }
}
