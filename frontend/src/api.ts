export type UserRole = 'administrator' | 'teacher' | 'student'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: User
}

export type AcademicPeriod = 'ANNUAL' | 'FIRST_SEMESTER' | 'SECOND_SEMESTER'

export interface Subject {
  id: string
  code: string
  name: string
  description: string | null
  credits: number
}

export interface CourseOffering {
  id: string
  year: number
  period: AcademicPeriod
  section: string
  capacity: number
  enrolled: number
  classroom: string | null
  schedule: string | null
  subject: Subject
  teacher: { name: string } | null
}

export interface Enrollment {
  id: string
  enrolledAt: string
  courseOffering: CourseOffering
}

export interface Grade {
  id: string
  title: string
  score: number
  weight: number
  comment: string | null
  updatedAt: string
}

export interface GradeSummary {
  evaluatedWeight: number
  finalScore: number
  passingScore: number
  status: 'PASSED' | 'FAILED' | 'IN_PROGRESS'
}

export interface GradedEnrollment {
  id: string
  grades: Grade[]
  summary: GradeSummary
}

export interface HistoryEntry extends GradedEnrollment {
  courseOffering: CourseOffering
}

export interface RosterEntry extends GradedEnrollment {
  student: {
    id: string
    studentCode: string
    firstName: string
    lastName: string
  }
}

export type StudentHistoryEntry = HistoryEntry & RosterEntry

export interface CourseRoster {
  offering: CourseOffering
  enrollments: RosterEntry[]
}

export const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3010').replace(
  /\/$/,
  '',
)
export const tokenStorageKey = 'unicen_access_token'

export const periodLabels: Record<AcademicPeriod, string> = {
  ANNUAL: 'Anual',
  FIRST_SEMESTER: 'Primer semestre',
  SECOND_SEMESTER: 'Segundo semestre',
}

export const gradeStatusLabels: Record<GradeSummary['status'], string> = {
  PASSED: 'Aprobado',
  FAILED: 'Reprobado',
  IN_PROGRESS: 'En curso',
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, options)
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
        ? body.message
        : 'No fue posible completar la solicitud.'
    throw new Error(message)
  }

  return body as T
}

// Authenticated request using the token stored for the current session.
export function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(tokenStorageKey)
  if (!token) {
    return Promise.reject(new Error('Tu sesión expiró. Inicia sesión nuevamente.'))
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (options.body) headers['Content-Type'] = 'application/json'
  return request<T>(path, { ...options, headers: { ...headers, ...options.headers } })
}

export function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback
}
