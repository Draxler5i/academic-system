import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DomainEventPublisher } from '../common/domain-event.publisher.js';
import { DomainEvent } from '../common/domain-events.js';
import { StudentProfilesService } from '../students/student-profiles.service.js';
import { CreateGradeDto } from './dto/create-grade.dto.js';
import { ListGradeHistoryDto } from './dto/list-grade-history.dto.js';
import { UpdateGradeDto } from './dto/update-grade.dto.js';
import { GradesRepository } from './grades.repository.js';
import { GradingPolicy } from './grading/grading-policy.js';
import type { WeightedScore } from './grading/grading-policy.js';

const maxTotalWeight = 100;

@Injectable()
export class GradesService {
  constructor(
    private readonly grades: GradesRepository,
    private readonly gradingPolicy: GradingPolicy,
    private readonly studentProfiles: StudentProfilesService,
    private readonly events: DomainEventPublisher,
  ) {}

  findTeaching(teacherId: string) {
    return this.grades.findCoursesTaughtBy(teacherId);
  }

  async findByCourseOffering(
    courseOfferingId: string,
    userId: string,
    isAdministrator: boolean,
  ) {
    const offering = await this.grades.findCourseOffering(courseOfferingId);
    if (!offering) {
      throw new NotFoundException('Oferta de curso no encontrada');
    }
    if (!isAdministrator && offering.teacherId !== userId) {
      throw new ForbiddenException(
        'Solo puedes consultar las notas de los cursos que dictas',
      );
    }

    const enrollments = await this.grades.findCourseRoster(courseOfferingId);
    return { offering, enrollments: this.withSummaries(enrollments) };
  }

  async findMyHistory(userId: string) {
    const studentId = await this.studentProfiles.getIdByUserId(userId);
    return this.withSummaries(await this.grades.findStudentHistory(studentId));
  }

  async findStudentHistory(studentId: string) {
    await this.studentProfiles.assertExists(studentId);
    return this.withSummaries(await this.grades.findStudentHistory(studentId));
  }

  async findAllHistory(filters: ListGradeHistoryDto) {
    return this.withSummaries(await this.grades.findHistory(filters));
  }

  async create(teacherId: string, dto: CreateGradeDto) {
    const courseTeacherId = await this.grades.findCourseTeacherOfEnrollment(
      dto.enrollmentId,
    );
    if (courseTeacherId === undefined) {
      throw new NotFoundException('Inscripción no encontrada');
    }
    this.assertTeaches(courseTeacherId, teacherId);
    await this.assertWeightAvailable(dto.enrollmentId, dto.weight);

    const grade = await this.grades.create({
      enrollmentId: dto.enrollmentId,
      title: dto.title.trim(),
      score: dto.score,
      weight: dto.weight,
      comment: dto.comment?.trim() || null,
      recordedById: teacherId,
    });
    this.events.publish(DomainEvent.GradeRecorded, {
      entityId: grade.id,
      actorId: teacherId,
      details: { enrollmentId: grade.enrollmentId, score: grade.score, weight: grade.weight },
    });
    return grade;
  }

  async update(id: string, teacherId: string, dto: UpdateGradeDto) {
    const existing = await this.findActiveGrade(id);
    this.assertTeaches(existing.courseTeacherId, teacherId);
    if (dto.weight !== undefined) {
      await this.assertWeightAvailable(existing.enrollmentId, dto.weight, id);
    }

    const grade = await this.grades.update(id, {
      title: dto.title?.trim(),
      score: dto.score,
      weight: dto.weight,
      comment: dto.comment === undefined ? undefined : dto.comment.trim() || null,
      recordedById: teacherId,
    });
    this.events.publish(DomainEvent.GradeUpdated, {
      entityId: id,
      actorId: teacherId,
      details: { changes: dto },
    });
    return grade;
  }

  /** Soft delete: the grade is kept for auditing but hidden from every query. */
  async remove(id: string, teacherId: string) {
    const existing = await this.findActiveGrade(id);
    this.assertTeaches(existing.courseTeacherId, teacherId);

    await this.grades.softDelete(id, teacherId);
    this.events.publish(DomainEvent.GradeDeleted, {
      entityId: id,
      actorId: teacherId,
      details: { enrollmentId: existing.enrollmentId },
    });
    return { id, deleted: true };
  }

  private withSummaries<T extends { grades: WeightedScore[] }>(enrollments: T[]) {
    return enrollments.map((enrollment) => ({
      ...enrollment,
      summary: this.gradingPolicy.summarize(enrollment.grades),
    }));
  }

  private async findActiveGrade(id: string) {
    const grade = await this.grades.findActiveGrade(id);
    if (!grade) {
      throw new NotFoundException('Nota no encontrada');
    }
    return grade;
  }

  private assertTeaches(courseTeacherId: string | null, teacherId: string) {
    if (courseTeacherId !== teacherId) {
      throw new ForbiddenException(
        'Solo puedes gestionar notas de los cursos que dictas',
      );
    }
  }

  private async assertWeightAvailable(
    enrollmentId: string,
    weight: number,
    excludedGradeId?: string,
  ) {
    const usedWeight = await this.grades.sumActiveWeight(enrollmentId, excludedGradeId);
    if (usedWeight + weight > maxTotalWeight) {
      throw new BadRequestException(
        `La ponderación supera el 100 %. Disponible: ${maxTotalWeight - usedWeight} %`,
      );
    }
  }
}
