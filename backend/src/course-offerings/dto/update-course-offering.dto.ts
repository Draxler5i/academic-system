import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseOfferingDto } from './create-course-offering.dto.js';

export class UpdateCourseOfferingDto extends PartialType(
  CreateCourseOfferingDto,
) {}
