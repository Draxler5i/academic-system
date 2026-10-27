import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../auth/auth.types.js';
import type { AuthTokenPayload } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CurrentUser } from '../common/current-user.decorator.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { EnrollmentsService } from './enrollments.service.js';

@Controller('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  findMine(@CurrentUser() user: AuthTokenPayload) {
    return this.enrollmentsService.findMine(user.sub);
  }

  @Get()
  @Roles(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  findAll() {
    return this.enrollmentsService.findAll();
  }

  @Post()
  @Roles(UserRole.STUDENT)
  create(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.create(user.sub, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.STUDENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.enrollmentsService.remove(
      id,
      user.sub,
      user.role === UserRole.ADMINISTRATOR,
    );
  }
}
