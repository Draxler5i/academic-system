import { AcademicPeriod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListCourseOfferingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsEnum(AcademicPeriod)
  period?: AcademicPeriod;

  @IsOptional()
  @IsUUID()
  subjectId?: string;
}
