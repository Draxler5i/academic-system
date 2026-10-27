import { AcademicPeriod } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCourseOfferingDto {
  @IsUUID()
  subjectId!: string;

  @IsInt()
  @Min(2020)
  @Max(2100)
  year!: number;

  @IsEnum(AcademicPeriod)
  period!: AcademicPeriod;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  section?: string;

  @IsInt()
  @Min(1)
  @Max(500)
  capacity!: number;

  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  classroom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  schedule?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
