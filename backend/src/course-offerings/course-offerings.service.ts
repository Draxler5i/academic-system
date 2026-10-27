import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaError, PrismaErrorCode } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto.js';
import { ListCourseOfferingsDto } from './dto/list-course-offerings.dto.js';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto.js';

@Injectable()
export class CourseOfferingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: ListCourseOfferingsDto) {
    return this.prisma.courseOffering.findMany({
      where: {
        year: filters.year,
        period: filters.period,
        subjectId: filters.subjectId,
      },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        { year: 'desc' },
        { period: 'asc' },
        { subject: { code: 'asc' } },
        { section: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const offering = await this.prisma.courseOffering.findUnique({
      where: { id },
      include: {
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
      },
    });
    if (!offering) {
      throw new NotFoundException('Oferta de curso no encontrada');
    }
    return offering;
  }

  async create(dto: CreateCourseOfferingDto) {
    this.validateEnrollmentCapacity(dto.capacity, 0);
    const {
      subjectId,
      teacherId,
      year,
      period,
      capacity,
      section,
      classroom,
      schedule,
    } = dto;
    try {
      return await this.prisma.courseOffering.create({
        data: {
          subjectId,
          teacherId,
          year,
          period,
          capacity,
          section: section?.trim().toUpperCase() ?? 'A',
          classroom: classroom?.trim(),
          schedule: schedule?.trim(),
        },
        include: { subject: true },
      });
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  async update(id: string, dto: UpdateCourseOfferingDto) {
    const existing = await this.prisma.courseOffering.findUnique({
      where: { id },
      select: { id: true, enrolled: true },
    });
    if (!existing) {
      throw new NotFoundException('Oferta de curso no encontrada');
    }
    this.validateEnrollmentCapacity(dto.capacity ?? 500, existing.enrolled);
    const {
      subjectId,
      teacherId,
      year,
      period,
      capacity,
      section,
      classroom,
      schedule,
      isActive,
    } = dto;

    try {
      return await this.prisma.courseOffering.update({
        where: { id },
        data: {
          subjectId,
          teacherId,
          year,
          period,
          capacity,
          section: section?.trim().toUpperCase(),
          classroom: classroom?.trim(),
          schedule: schedule?.trim(),
          isActive,
        },
        include: { subject: true },
      });
    } catch (error) {
      this.throwDatabaseError(error);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.courseOffering.delete({ where: { id } });
    return { id, deleted: true };
  }

  private validateEnrollmentCapacity(capacity: number, enrolled: number) {
    if (capacity < enrolled) {
      throw new ConflictException(
        'La capacidad no puede ser menor que las inscripciones actuales',
      );
    }
  }

  private throwDatabaseError(error: unknown): never {
    if (isPrismaError(error, PrismaErrorCode.UniqueConstraint)) {
      throw new ConflictException(
        'Ya existe una oferta para esa materia, gestión, periodo y paralelo',
      );
    }
    if (isPrismaError(error, PrismaErrorCode.ForeignKeyConstraint)) {
      throw new NotFoundException('Materia o docente no encontrado');
    }
    throw error;
  }
}
