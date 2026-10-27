import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../auth/auth.types.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { UpdateSubjectDto } from './dto/update-subject.dto.js';
import { SubjectsService } from './subjects.service.js';

@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @Roles(UserRole.ADMINISTRATOR, UserRole.TEACHER, UserRole.STUDENT)
  findAll() {
    return this.subjectsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.TEACHER, UserRole.STUDENT)
  findOne(@Param('id') id: string) {
    return this.subjectsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMINISTRATOR)
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRATOR)
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRATOR)
  remove(@Param('id') id: string) {
    return this.subjectsService.remove(id);
  }
}
