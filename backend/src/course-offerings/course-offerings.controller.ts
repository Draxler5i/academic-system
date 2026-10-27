import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../auth/auth.types.js';
import { CourseOfferingsService } from './course-offerings.service.js';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto.js';
import { ListCourseOfferingsDto } from './dto/list-course-offerings.dto.js';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto.js';

@Controller('course-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseOfferingsController {
  constructor(private readonly offeringsService: CourseOfferingsService) {}

  @Get()
  @Roles(UserRole.ADMINISTRATOR, UserRole.TEACHER, UserRole.STUDENT)
  findAll(@Query() filters: ListCourseOfferingsDto) {
    return this.offeringsService.findAll(filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.TEACHER, UserRole.STUDENT)
  findOne(@Param('id') id: string) {
    return this.offeringsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMINISTRATOR)
  create(@Body() dto: CreateCourseOfferingDto) {
    return this.offeringsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATOR)
  update(@Param('id') id: string, @Body() dto: UpdateCourseOfferingDto) {
    return this.offeringsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR)
  remove(@Param('id') id: string) {
    return this.offeringsService.remove(id);
  }
}
