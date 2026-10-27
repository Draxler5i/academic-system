import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaError, PrismaErrorCode } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { UpdateSubjectDto } from './dto/update-subject.dto.js';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.subject.findMany({
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) {
      throw new NotFoundException('Materia no encontrada');
    }
    return subject;
  }

  async create(dto: CreateSubjectDto) {
    const { code, name, description, credits, isActive } = dto;
    try {
      return await this.prisma.subject.create({
        data: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description?.trim(),
          credits,
          isActive,
        },
      });
    } catch (error) {
      this.throwIfUniqueConstraint(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateSubjectDto) {
    await this.findOne(id);
    const { code, name, description, credits, isActive } = dto;
    try {
      return await this.prisma.subject.update({
        where: { id },
        data: {
          code: code?.trim().toUpperCase(),
          name: name?.trim(),
          description: description?.trim(),
          credits,
          isActive,
        },
      });
    } catch (error) {
      this.throwIfUniqueConstraint(error);
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.subject.delete({ where: { id } });
      return { id, deleted: true };
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.ForeignKeyConstraint)) {
        throw new ConflictException(
          'No se puede eliminar una materia con ofertas de cursos asociadas',
        );
      }
      throw error;
    }
  }

  private throwIfUniqueConstraint(error: unknown): void {
    if (isPrismaError(error, PrismaErrorCode.UniqueConstraint)) {
      throw new ConflictException('El código de materia ya está registrado');
    }
  }
}
