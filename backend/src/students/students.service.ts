import { hash } from 'bcryptjs';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

const studentSelect = {
  id: true,
  studentCode: true,
  firstName: true,
  lastName: true,
  phone: true,
  birthDate: true,
  address: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, role: true } },
} satisfies Prisma.StudentSelect;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.student.findMany({
      select: studentSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: studentSelect,
    });
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    return student;
  }

  async create(dto: CreateStudentDto) {
    try {
      const passwordHash = await hash(dto.password, 12);
      return await this.prisma.student.create({
        data: {
          studentCode: dto.studentCode.trim(),
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          address: dto.address?.trim(),
          user: {
            create: {
              email: dto.email.trim().toLowerCase(),
              passwordHash,
              name: `${dto.firstName.trim()} ${dto.lastName.trim()}`,
              role: 'STUDENT',
            },
          },
        },
        select: studentSelect,
      });
    } catch (error) {
      this.throwIfUniqueConstraint(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateStudentDto) {
    const existing = await this.findOne(id);
    try {
      const data: Prisma.StudentUpdateInput = {
        studentCode: dto.studentCode?.trim(),
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
        phone: dto.phone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        address: dto.address?.trim(),
      };

      if (
        dto.email !== undefined ||
        dto.password !== undefined ||
        dto.firstName !== undefined ||
        dto.lastName !== undefined
      ) {
        const userUpdate: Prisma.UserUpdateWithoutStudentInput = {
          email: dto.email?.trim().toLowerCase(),
          name:
            dto.firstName !== undefined || dto.lastName !== undefined
              ? `${dto.firstName?.trim() ?? existing.firstName} ${
                  dto.lastName?.trim() ?? existing.lastName
                }`
              : undefined,
          passwordHash: dto.password ? await hash(dto.password, 12) : undefined,
        };
        data.user = { update: userUpdate };
      }

      return await this.prisma.student.update({
        where: { id },
        data,
        select: studentSelect,
      });
    } catch (error) {
      this.throwIfUniqueConstraint(error);
      throw error;
    }
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    await this.prisma.user.delete({ where: { id: student.userId } });
    return { id: student.id, deleted: true };
  }

  private throwIfUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'El correo, código de estudiante o identificador ya está registrado',
      );
    }
  }
}
