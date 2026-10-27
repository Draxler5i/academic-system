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

  const firstName = required('DEMO_STUDENT_FIRST_NAME');
  const lastName = required('DEMO_STUDENT_LAST_NAME');
  const student = await seedAccount({
    email: required('DEMO_STUDENT_EMAIL'),
    password: required('DEMO_STUDENT_PASSWORD'),
    name: `${firstName} ${lastName}`,
    role: 'STUDENT',
  });

  await prisma.student.upsert({
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

  console.log('Administrator and demo student accounts are ready.');
}

main()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
