export enum UserRole {
  ADMINISTRATOR = 'administrator',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthTokenPayload extends AuthUser {
  sub: string;
}
