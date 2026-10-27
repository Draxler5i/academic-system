import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be configured before seeding`);
  }
  return value;
}

async function seedAccount({ email, password, name, role }) {
  const passwordHash = await hash(password, 12);
  return prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, name, role },
    create: { email: email.toLowerCase(), passwordHash, name, role },
  });
}

async function main() {
  await seedAccount({
    email: required('ADMIN_EMAIL'),
    password: required('ADMIN_PASSWORD'),
    name: process.env.ADMIN_NAME ?? 'Administrador UNICEN',
    role: 'ADMINISTRATOR',
  });

  const teacher = await seedAccount({
    email: required('DEMO_TEACHER_EMAIL'),
    password: required('DEMO_TEACHER_PASSWORD'),
    name: process.env.DEMO_TEACHER_NAME ?? 'Docente de prueba',
    role: 'TEACHER',
  });

  const firstName = required('DEMO_STUDENT_FIRST_NAME');
  const lastName = required('DEMO_STUDENT_LAST_NAME');
  const student = await seedAccount({
    email: required('DEMO_STUDENT_EMAIL'),
    password: required('DEMO_STUDENT_PASSWORD'),
    name: `${firstName} ${lastName}`,
    role: 'STUDENT',
  });

  const studentProfile = await prisma.student.upsert({
    where: { userId: student.id },
    update: {
      studentCode: required('DEMO_STUDENT_CODE'),
      firstName,
      lastName,
    },
    create: {
      userId: student.id,
      studentCode: required('DEMO_STUDENT_CODE'),
      firstName,
      lastName,
    },
  });

  const subjects = [
    {
      code: 'MAT-101',
      name: 'Álgebra',
      description: 'Fundamentos de álgebra para ciencias e ingeniería.',
      credits: 5,
    },
    {
      code: 'INF-101',
      name: 'Programación I',
      description: 'Algoritmos, estructuras básicas y resolución de problemas.',
      credits: 5,
    },
    {
      code: 'FIS-101',
      name: 'Física General',
      description: 'Principios de mecánica y física clásica.',
      credits: 4,
    },
    {
      code: 'ADM-101',
      name: 'Administración General',
      description: 'Conceptos y funciones fundamentales de la administración.',
      credits: 4,
    },
    {
      code: 'COM-101',
      name: 'Comunicación Académica',
      description: 'Lectura, escritura y comunicación en contextos académicos.',
      credits: 3,
    },
    {
      code: 'EST-201',
      name: 'Estadística I',
      description: 'Estadística descriptiva, probabilidad e inferencia básica.',
      credits: 4,
    },
  ];

  const seededSubjects = new Map();
  for (const subject of subjects) {
    const saved = await prisma.subject.upsert({
      where: { code: subject.code },
      update: {
        name: subject.name,
        description: subject.description,
        credits: subject.credits,
        isActive: true,
      },
      create: subject,
    });
    seededSubjects.set(subject.code, saved);
  }

  const offerings = [
    { code: 'MAT-101', section: 'A', period: 'FIRST_SEMESTER', capacity: 35, classroom: 'Aula 101', schedule: 'Lun-Mié 08:00-09:30' },
    { code: 'MAT-101', section: 'B', period: 'FIRST_SEMESTER', capacity: 30, classroom: 'Aula 102', schedule: 'Mar-Jue 10:00-11:30' },
    { code: 'INF-101', section: 'A', period: 'FIRST_SEMESTER', capacity: 28, classroom: 'Laboratorio 1', schedule: 'Lun-Mié 10:00-11:30' },
    { code: 'FIS-101', section: 'A', period: 'FIRST_SEMESTER', capacity: 32, classroom: 'Laboratorio 2', schedule: 'Mar-Jue 08:00-09:30' },
    { code: 'ADM-101', section: 'A', period: 'SECOND_SEMESTER', capacity: 40, classroom: 'Aula 201', schedule: 'Lun-Mié 14:00-15:30' },
    { code: 'COM-101', section: 'A', period: 'ANNUAL', capacity: 35, classroom: 'Aula 103', schedule: 'Vie 08:00-11:00' },
    { code: 'EST-201', section: 'A', period: 'SECOND_SEMESTER', capacity: 30, classroom: 'Aula 202', schedule: 'Mar-Jue 14:00-15:30' },
  ];

  for (const offering of offerings) {
    const subject = seededSubjects.get(offering.code);
    await prisma.courseOffering.upsert({
      where: {
        subjectId_year_period_section: {
          subjectId: subject.id,
          year: 2026,
          period: offering.period,
          section: offering.section,
        },
      },
      update: {
        capacity: offering.capacity,
        classroom: offering.classroom,
        schedule: offering.schedule,
        isActive: true,
      },
      create: {
        subjectId: subject.id,
        year: 2026,
        period: offering.period,
        section: offering.section,
        capacity: offering.capacity,
        classroom: offering.classroom,
        schedule: offering.schedule,
      },
    });
  }

  const demoGrades = {
    'MAT-101': [
      { title: 'Primer parcial', score: 72, weight: 30 },
      { title: 'Segundo parcial', score: 65, weight: 30 },
    ],
    'INF-101': [{ title: 'Práctica 1', score: 88, weight: 20 }],
  };

  for (const code of ['MAT-101', 'INF-101']) {
    const subject = seededSubjects.get(code);
    const offering = await prisma.courseOffering.findUnique({
      where: {
        subjectId_year_period_section: {
          subjectId: subject.id,
          year: 2026,
          period: 'FIRST_SEMESTER',
          section: 'A',
        },
      },
    });
    if (!offering) {
      throw new Error(`Demo course offering for ${code} was not created`);
    }

    await prisma.courseOffering.update({
      where: { id: offering.id },
      data: { teacherId: teacher.id },
    });

    const enrollment = await prisma.enrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: studentProfile.id,
          courseOfferingId: offering.id,
        },
      },
      update: {},
      create: {
        studentId: studentProfile.id,
        courseOfferingId: offering.id,
      },
    });

    const enrolled = await prisma.enrollment.count({
      where: { courseOfferingId: offering.id },
    });
    await prisma.courseOffering.update({
      where: { id: offering.id },
      data: { enrolled },
    });

    // Only seed grades once so re-running the seed never overrides a teacher's edits.
    const hasGrades = await prisma.grade.count({
      where: { enrollmentId: enrollment.id },
    });
    if (!hasGrades) {
      await prisma.grade.createMany({
        data: demoGrades[code].map((grade) => ({
          ...grade,
          enrollmentId: enrollment.id,
          recordedById: teacher.id,
        })),
      });
    }
  }

  console.log(
    `Seeded accounts, ${subjects.length} subjects, ${offerings.length} course offerings, demo enrollments and grades.`,
  );
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
