import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGradeDto {
  @IsUUID()
  enrollmentId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  title!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  score!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  weight!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  comment?: string;
}
