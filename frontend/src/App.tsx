import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { AcademicHistory } from './AcademicHistory'
import { AdminAcademicHistory } from './AdminAcademicHistory'
import { periodLabels, request, tokenStorageKey } from './api'
import type { CourseOffering, Enrollment, LoginResponse, User } from './api'
import { TeacherGrades } from './TeacherGrades'

async function loadStudentData(token: string) {
  const headers = { Authorization: `Bearer ${token}` }
  const [offerings, enrollments] = await Promise.all([
    request<CourseOffering[]>('/course-offerings?year=2026', { headers }),
    request<Enrollment[]>('/enrollments/me', { headers }),
  ])
  return { offerings, enrollments }
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('estudiante@unicen.edu.bo')
  const [password, setPassword] = useState('Estudiante123!')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(() =>
    Boolean(sessionStorage.getItem(tokenStorageKey)),
  )
  const [offerings, setOfferings] = useState<CourseOffering[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(() =>
    Boolean(sessionStorage.getItem(tokenStorageKey)),
  )
  const [pendingOfferingId, setPendingOfferingId] = useState<string | null>(null)
  const [courseError, setCourseError] = useState('')
  const [courseMessage, setCourseMessage] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) return

    request<User>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setUser)
      .catch(() => sessionStorage.removeItem(tokenStorageKey))
      .finally(() => setIsCheckingSession(false))
  }, [])

  useEffect(() => {
    if (user?.role !== 'student') return

    let isCurrent = true
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) return

    loadStudentData(token)
      .then((data) => {
        if (!isCurrent) return
        setOfferings(data.offerings)
        setEnrollments(data.enrollments)
        setCourseError('')
      })
      .catch((reason: unknown) => {
        if (!isCurrent) return
        setCourseError(
          reason instanceof Error
            ? reason.message
            : 'No fue posible cargar los cursos.',
        )
      })
      .finally(() => {
        if (isCurrent) setIsLoadingCourses(false)
      })

    return () => {
      isCurrent = false
    }
  }, [user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      sessionStorage.setItem(tokenStorageKey, result.accessToken)
      setIsLoadingCourses(result.user.role === 'student')
      setUser(result.user)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible iniciar sesión. Intenta nuevamente.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(tokenStorageKey)
    setUser(null)
    setPassword('')
    setOfferings([])
    setEnrollments([])
    setIsLoadingCourses(false)
  }

  async function refreshStudentData() {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
    const data = await loadStudentData(token)
    setOfferings(data.offerings)
    setEnrollments(data.enrollments)
  }

  async function handleEnrollment(offeringId: string) {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      setCourseError('Tu sesión expiró. Inicia sesión nuevamente.')
      return
    }

    setPendingOfferingId(offeringId)
    setCourseError('')
    setCourseMessage('')
    try {
      await request<Enrollment>('/enrollments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseOfferingId: offeringId }),
      })
      await refreshStudentData()
      setCourseMessage('Te inscribiste al curso correctamente.')
    } catch (reason) {
      setCourseError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible completar la inscripción.',
      )
    } finally {
      setPendingOfferingId(null)
    }
  }

  async function handleCancellation(enrollmentId: string) {
    const token = sessionStorage.getItem(tokenStorageKey)
    if (!token) {
      setCourseError('Tu sesión expiró. Inicia sesión nuevamente.')
      return
    }

    setPendingOfferingId(enrollmentId)
    setCourseError('')
    setCourseMessage('')
    try {
      await request<{ deleted: boolean }>(`/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      await refreshStudentData()
      setCourseMessage('Cancelaste tu inscripción.')
    } catch (reason) {
      setCourseError(
        reason instanceof Error
          ? reason.message
          : 'No fue posible cancelar la inscripción.',
      )
    } finally {
      setPendingOfferingId(null)
    }
  }

  if (isCheckingSession) {
    return (
      <main className="page-shell">
        <p className="session-check" role="status">Verificando sesión...</p>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <header className="brand">
        <div className="brand-mark" aria-hidden="true">U</div>
        <div>
          <p className="brand-name">UNICEN</p>
          <p className="brand-caption">SISTEMA ACADÉMICO</p>
        </div>
      </header>

      <section
        className={`login-card${user ? ' dashboard-card' : ''}`}
        aria-labelledby="page-title"
      >
        <div className="card-accent" />
        {user ? (
          <div className="welcome-panel">
            <div className="welcome-icon" aria-hidden="true">
              {user.name.charAt(0)}
            </div>
            <p className="eyebrow">SESIÓN INICIADA</p>
            <h1 id="page-title">¡Bienvenido!</h1>
            <p className="welcome-copy">
              Has iniciado sesión como <strong>{user.name}</strong>.
            </p>
            <button className="button button-secondary" onClick={handleLogout}>
              Cerrar sesión
            </button>
            {user.role === 'student' && (
              <section className="student-courses" aria-labelledby="courses-title">
                <div className="courses-heading">
                  <div>
                    <p className="eyebrow">GESTIÓN 2026</p>
                    <h2 id="courses-title">Inscripción a cursos</h2>
                  </div>
                  <span className="enrollment-count">
                    {enrollments.length} inscritos
                  </span>
                </div>

                {courseError && (
                  <p className="course-feedback course-feedback-error" role="alert">
                    {courseError}
                  </p>
                )}
                {courseMessage && (
                  <p className="course-feedback course-feedback-success" role="status">
                    {courseMessage}
                  </p>
                )}

                {isLoadingCourses ? (
                  <p className="course-empty" role="status">Cargando cursos...</p>
                ) : (
                  <>
                    <h3 className="course-section-title">Mis inscripciones</h3>
                    {enrollments.length === 0 ? (
                      <p className="course-empty">
                        Aún no tienes cursos inscritos.
                      </p>
                    ) : (
                      <div className="course-list">
                        {enrollments.map((enrollment) => {
                          const offering = enrollment.courseOffering
                          return (
                            <article className="course-item course-item-enrolled" key={enrollment.id}>
                              <div className="course-item-main">
                                <span className="course-code">{offering.subject.code}</span>
                                <h4>{offering.subject.name}</h4>
                                <p>
                                  {periodLabels[offering.period]} {offering.year}
                                  {' · Paralelo '}{offering.section}
                                  {' · '}{offering.subject.credits} créditos
                                </p>
                              </div>
                              <button
                                className="course-action course-action-cancel"
                                disabled={pendingOfferingId === enrollment.id}
                                onClick={() => void handleCancellation(enrollment.id)}
                                type="button"
                              >
                                {pendingOfferingId === enrollment.id ? 'Procesando...' : 'Cancelar'}
                              </button>
                            </article>
                          )
                        })}
                      </div>
                    )}

                    <h3 className="course-section-title available-title">
                      Ofertas disponibles
                    </h3>
                    <div className="course-list">
                      {offerings.map((offering) => {
                        const enrollment = enrollments.find(
                          (item) => item.courseOffering.id === offering.id,
                        )
                        const hasSeats = offering.enrolled < offering.capacity
                        const isPending = pendingOfferingId === offering.id

                        return (
                          <article className="course-item" key={offering.id}>
                            <div className="course-item-main">
                              <span className="course-code">{offering.subject.code}</span>
                              <h4>{offering.subject.name}</h4>
                              {offering.subject.description && (
                                <p className="course-description">
                                  {offering.subject.description}
                                </p>
                              )}
                              <p>
                                {periodLabels[offering.period]} {offering.year}
                                {' · Paralelo '}{offering.section}
                                {' · '}{offering.subject.credits} créditos
                              </p>
                              {(offering.schedule || offering.classroom) && (
                                <p>
                                  {[offering.schedule, offering.classroom]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              )}
                              {offering.teacher && <p>Docente: {offering.teacher.name}</p>}
                              <span className={`seat-status ${hasSeats ? '' : 'seat-status-full'}`}>
                                {hasSeats
                                  ? `${offering.capacity - offering.enrolled} cupos disponibles`
                                  : 'Sin cupos disponibles'}
                              </span>
                            </div>
                            {enrollment ? (
                              <span className="already-enrolled">Inscrito</span>
                            ) : (
                              <button
                                className="course-action"
                                disabled={!hasSeats || pendingOfferingId !== null}
                                onClick={() => void handleEnrollment(offering.id)}
                                type="button"
                              >
                                {isPending ? 'Inscribiendo...' : 'Inscribirme'}
                              </button>
                            )}
                          </article>
                        )
                      })}
                      {offerings.length === 0 && (
                        <p className="course-empty">
                          No hay ofertas disponibles para esta gestión.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}
            {user.role === 'student' && !isLoadingCourses && (
              <AcademicHistory key={enrollments.map((item) => item.id).join()} />
            )}
            {user.role === 'teacher' && <TeacherGrades />}
            {user.role === 'administrator' && <AdminAcademicHistory />}
          </div>
        ) : (
          <>
            <div className="card-heading">
              <p className="eyebrow">PORTAL UNIVERSITARIO</p>
              <h1 id="page-title">Inicia sesión</h1>
              <p className="subtitle">Ingresa tus credenciales para continuar.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="email">Correo electrónico</label>
              <input
                autoComplete="username"
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@unicen.edu.bo"
                required
                type="email"
                value={email}
              />

              <label htmlFor="password">Contraseña</label>
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />

              {error && <p className="error-message" role="alert">{error}</p>}

              <button className="button" disabled={isLoading} type="submit">
                {isLoading ? 'Ingresando...' : 'Ingresar'}
                {!isLoading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <aside className="demo-credentials">
              <span className="demo-icon" aria-hidden="true">i</span>
              <p>
                <strong>Cuentas de prueba</strong>
                <br />
                Estudiante: estudiante@unicen.edu.bo · Estudiante123!
                <br />
                Docente: docente@unicen.edu.bo · Docente123!
              </p>
            </aside>
          </>
        )}
      </section>

      <footer className="page-footer">
        <span>UNICEN · Sistema Académico</span>
        <span>Acceso seguro para la comunidad universitaria</span>
      </footer>
    </main>
  )
}

export default App
