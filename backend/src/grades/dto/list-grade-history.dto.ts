import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ListCourseOfferingsDto } from '../../course-offerings/dto/list-course-offerings.dto.js';

export class ListGradeHistoryDto extends ListCourseOfferingsDto {
  @IsOptional()
  @IsUUID()
  courseOfferingId?: string;

  // Matches the student's code, first name or last name.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}
