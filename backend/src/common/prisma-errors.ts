import { Prisma } from '@prisma/client';

export const PrismaErrorCode = {
  UniqueConstraint: 'P2002',
  ForeignKeyConstraint: 'P2003',
} as const;

type PrismaErrorCode = (typeof PrismaErrorCode)[keyof typeof PrismaErrorCode];

export function isPrismaError(error: unknown, code: PrismaErrorCode) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
