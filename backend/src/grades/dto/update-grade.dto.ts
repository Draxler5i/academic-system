import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateGradeDto } from './create-grade.dto.js';

export class UpdateGradeDto extends PartialType(
  OmitType(CreateGradeDto, ['enrollmentId'] as const),
) {}
