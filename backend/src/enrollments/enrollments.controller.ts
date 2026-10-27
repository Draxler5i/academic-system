import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthTokenPayload, UserRole } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { EnrollmentsService } from './enrollments.service.js';

type AuthenticatedRequest = Request & { user: AuthTokenPayload };

@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  findMine(@Req() request: AuthenticatedRequest) {
    return this.enrollmentsService.findMine(request.user.sub);
  }

  @Get()
  @Roles(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  findAll() {
    return this.enrollmentsService.findAll();
  }

  @Post()
  @Roles(UserRole.STUDENT)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.create(request.user.sub, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.STUDENT)
  remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.enrollmentsService.remove(
      id,
      request.user.sub,
      request.user.role === UserRole.ADMINISTRATOR,
    );
  }
}
