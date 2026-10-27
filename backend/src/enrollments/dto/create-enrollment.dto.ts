import { IsUUID } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  courseOfferingId!: string;
}
