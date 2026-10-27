import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { DomainEventPublisher } from '../common/domain-event.publisher.js';
import { DomainEvent } from '../common/domain-events.js';
import type { StudentProfilesService } from '../students/student-profiles.service.js';
import type { GradesRepository } from './grades.repository.js';
import { GradesService } from './grades.service.js';
import { WeightedGradingPolicy } from './grading/weighted-grading.policy.js';

const teacherId = 'teacher-1';
const enrollmentId = 'enrollment-1';

function setup() {
  const repository = {
    findCourseTeacherOfEnrollment: vi.fn().mockResolvedValue(teacherId),
    findActiveGrade: vi.fn().mockResolvedValue({
      id: 'grade-1',
      enrollmentId,
      courseTeacherId: teacherId,
    }),
    sumActiveWeight: vi.fn().mockResolvedValue(60),
    create: vi.fn().mockImplementation((grade: object) =>
      Promise.resolve({ id: 'grade-2', ...grade }),
    ),
    update: vi.fn().mockResolvedValue({ id: 'grade-1' }),
    softDelete: vi.fn().mockResolvedValue(undefined),
    findStudentHistory: vi.fn().mockResolvedValue([
      { id: enrollmentId, grades: [{ score: 80, weight: 50 }, { score: 60, weight: 50 }] },
    ]),
  };
  const publisher = { publish: vi.fn() };
  const studentProfiles = { getIdByUserId: vi.fn().mockResolvedValue('student-1') };

  const service = new GradesService(
    repository as unknown as GradesRepository,
    new WeightedGradingPolicy(51),
    studentProfiles as unknown as StudentProfilesService,
    publisher as unknown as DomainEventPublisher,
  );
  return { service, repository, publisher };
}

const newGrade = { enrollmentId, title: ' Examen final ', score: 90, weight: 40 };

describe('GradesService', () => {
  it('records a grade for the course teacher and publishes an event', async () => {
    const { service, repository, publisher } = setup();

    await service.create(teacherId, newGrade);

    expect(repository.create).toHaveBeenCalledWith({
      enrollmentId,
      title: 'Examen final',
      score: 90,
      weight: 40,
      comment: null,
      recordedById: teacherId,
    });
    expect(publisher.publish).toHaveBeenCalledWith(
      DomainEvent.GradeRecorded,
      expect.objectContaining({ entityId: 'grade-2', actorId: teacherId }),
    );
  });

  it('rejects grades from a teacher who does not teach the course', async () => {
    const { service, repository } = setup();

    await expect(service.create('other-teacher', newGrade)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects grades that push the total weight above 100 %', async () => {
    const { service } = setup();

    await expect(
      service.create(teacherId, { ...newGrade, weight: 41 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 for a missing enrollment', async () => {
    const { service, repository } = setup();
    repository.findCourseTeacherOfEnrollment.mockResolvedValue(undefined);

    await expect(service.create(teacherId, newGrade)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('soft deletes a grade instead of removing it', async () => {
    const { service, repository, publisher } = setup();

    await expect(service.remove('grade-1', teacherId)).resolves.toEqual({
      id: 'grade-1',
      deleted: true,
    });
    expect(repository.softDelete).toHaveBeenCalledWith('grade-1', teacherId);
    expect(publisher.publish).toHaveBeenCalledWith(
      DomainEvent.GradeDeleted,
      expect.objectContaining({ entityId: 'grade-1' }),
    );
  });

  it('cannot delete a grade that is already deleted', async () => {
    const { service, repository } = setup();
    repository.findActiveGrade.mockResolvedValue(null);

    await expect(service.remove('grade-1', teacherId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.softDelete).not.toHaveBeenCalled();
  });

  it('adds the grading policy summary to the academic history', async () => {
    const { service } = setup();

    const [entry] = await service.findMyHistory('user-1');

    expect(entry.summary).toEqual({
      evaluatedWeight: 100,
      finalScore: 70,
      passingScore: 51,
      status: 'PASSED',
    });
  });
});
