import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DomainEventPublisher } from '../common/domain-event.publisher.js';
import { DomainEvent } from '../common/domain-events.js';
import { StudentProfilesService } from '../students/student-profiles.service.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { EnrollmentsRepository } from './enrollments.repository.js';

const duplicateEnrollmentMessage = 'El estudiante ya está inscrito en esta oferta';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly enrollments: EnrollmentsRepository,
    private readonly studentProfiles: StudentProfilesService,
    private readonly events: DomainEventPublisher,
  ) {}

  async findMine(userId: string) {
    const studentId = await this.studentProfiles.getIdByUserId(userId);
    return this.enrollments.findByStudent(studentId);
  }

  findAll() {
    return this.enrollments.findAll();
  }

  async create(userId: string, dto: CreateEnrollmentDto) {
    const studentId = await this.studentProfiles.getIdByUserId(userId);

    const availability = await this.enrollments.findOfferingAvailability(
      dto.courseOfferingId,
    );
    if (!availability) {
      throw new NotFoundException('Oferta de curso no encontrada');
    }
    if (!availability.isOpen) {
      throw new ConflictException('La oferta de curso no está disponible');
    }
    if (await this.enrollments.exists(studentId, dto.courseOfferingId)) {
      throw new ConflictException(duplicateEnrollmentMessage);
    }

    const result = await this.enrollments.enrollReservingSeat(
      studentId,
      dto.courseOfferingId,
    );
    if (!result.ok) {
      throw new ConflictException(
        result.reason === 'DUPLICATE'
          ? duplicateEnrollmentMessage
          : 'La oferta de curso no tiene cupos disponibles',
      );
    }

    this.events.publish(DomainEvent.EnrollmentCreated, {
      entityId: result.enrollment.id,
      actorId: userId,
      details: { courseOfferingId: dto.courseOfferingId },
    });
    return result.enrollment;
  }

  async remove(id: string, userId: string, isAdministrator: boolean) {
    const enrollment = await this.enrollments.findRef(id);
    if (!enrollment) {
      throw new NotFoundException('Inscripción no encontrada');
    }
    if (!isAdministrator && enrollment.studentUserId !== userId) {
      throw new ForbiddenException(
        'Solo puedes cancelar tus propias inscripciones',
      );
    }
    // Includes soft-deleted grades: removing the enrollment would erase them for good.
    if ((await this.enrollments.countGrades(id)) > 0) {
      throw new ConflictException(
        'No se puede cancelar una inscripción con notas registradas',
      );
    }

    await this.enrollments.deleteReleasingSeat(enrollment);
    this.events.publish(DomainEvent.EnrollmentCancelled, {
      entityId: id,
      actorId: userId,
      details: { courseOfferingId: enrollment.courseOfferingId },
    });
    return { id, deleted: true };
  }
}
