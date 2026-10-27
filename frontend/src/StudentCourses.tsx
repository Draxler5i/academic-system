import { useEffect, useState } from 'react'
import { AcademicHistory } from './AcademicHistory'
import { authRequest, errorMessage, periodLabels } from './api'
import type { CourseOffering, Enrollment } from './api'

const currentYear = 2026

async function loadStudentData() {
  const [offerings, enrollments] = await Promise.all([
    authRequest<CourseOffering[]>(`/course-offerings?year=${currentYear}`),
    authRequest<Enrollment[]>('/enrollments/me'),
  ])
  return { offerings, enrollments }
}

function offeringDetails(offering: CourseOffering) {
  return `${periodLabels[offering.period]} ${offering.year} · Paralelo ${
    offering.section
  } · ${offering.subject.credits} créditos`
}

export function StudentCourses() {
  const [offerings, setOfferings] = useState<CourseOffering[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Offering being enrolled or enrollment being cancelled.
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let isCurrent = true
    loadStudentData()
      .then((data) => {
        if (!isCurrent) return
        setOfferings(data.offerings)
        setEnrollments(data.enrollments)
      })
      .catch((reason: unknown) => {
        if (isCurrent) setError(errorMessage(reason, 'No fue posible cargar los cursos.'))
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  async function runAction(
    id: string,
    action: () => Promise<unknown>,
    success: string,
    failure: string,
  ) {
    setPendingId(id)
    setError('')
    setMessage('')
    try {
      await action()
      const data = await loadStudentData()
      setOfferings(data.offerings)
      setEnrollments(data.enrollments)
      setMessage(success)
    } catch (reason) {
      setError(errorMessage(reason, failure))
    } finally {
      setPendingId(null)
    }
  }

  function enroll(offeringId: string) {
    void runAction(
      offeringId,
      () =>
        authRequest('/enrollments', {
          method: 'POST',
          body: JSON.stringify({ courseOfferingId: offeringId }),
        }),
      'Te inscribiste al curso correctamente.',
      'No fue posible completar la inscripción.',
    )
  }

  function cancel(enrollmentId: string) {
    void runAction(
      enrollmentId,
      () => authRequest(`/enrollments/${enrollmentId}`, { method: 'DELETE' }),
      'Cancelaste tu inscripción.',
      'No fue posible cancelar la inscripción.',
    )
  }

  const enrolledOfferingIds = new Set(enrollments.map((item) => item.courseOffering.id))

  return (
    <>
      <section className="student-courses" aria-labelledby="courses-title">
        <div className="courses-heading">
          <div>
            <p className="eyebrow">GESTIÓN {currentYear}</p>
            <h2 id="courses-title">Inscripción a cursos</h2>
          </div>
          <span className="enrollment-count">{enrollments.length} inscritos</span>
        </div>

        {error && (
          <p className="course-feedback course-feedback-error" role="alert">{error}</p>
        )}
        {message && (
          <p className="course-feedback course-feedback-success" role="status">{message}</p>
        )}

        {isLoading ? (
          <p className="course-empty" role="status">Cargando cursos...</p>
        ) : (
          <>
            <h3 className="course-section-title">Mis inscripciones</h3>
            {enrollments.length === 0 ? (
              <p className="course-empty">Aún no tienes cursos inscritos.</p>
            ) : (
              <div className="course-list">
                {enrollments.map((enrollment) => {
                  const offering = enrollment.courseOffering
                  return (
                    <article className="course-item course-item-enrolled" key={enrollment.id}>
                      <div className="course-item-main">
                        <span className="course-code">{offering.subject.code}</span>
                        <h4>{offering.subject.name}</h4>
                        <p>{offeringDetails(offering)}</p>
                      </div>
                      <button
                        className="course-action course-action-cancel"
                        disabled={pendingId === enrollment.id}
                        onClick={() => cancel(enrollment.id)}
                        type="button"
                      >
                        {pendingId === enrollment.id ? 'Procesando...' : 'Cancelar'}
                      </button>
                    </article>
                  )
                })}
              </div>
            )}

            <h3 className="course-section-title available-title">Ofertas disponibles</h3>
            <div className="course-list">
              {offerings.map((offering) => {
                const hasSeats = offering.enrolled < offering.capacity
                return (
                  <article className="course-item" key={offering.id}>
                    <div className="course-item-main">
                      <span className="course-code">{offering.subject.code}</span>
                      <h4>{offering.subject.name}</h4>
                      {offering.subject.description && (
                        <p className="course-description">{offering.subject.description}</p>
                      )}
                      <p>{offeringDetails(offering)}</p>
                      {(offering.schedule || offering.classroom) && (
                        <p>
                          {[offering.schedule, offering.classroom].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {offering.teacher && <p>Docente: {offering.teacher.name}</p>}
                      <span className={`seat-status ${hasSeats ? '' : 'seat-status-full'}`}>
                        {hasSeats
                          ? `${offering.capacity - offering.enrolled} cupos disponibles`
                          : 'Sin cupos disponibles'}
                      </span>
                    </div>
                    {enrolledOfferingIds.has(offering.id) ? (
                      <span className="already-enrolled">Inscrito</span>
                    ) : (
                      <button
                        className="course-action"
                        disabled={!hasSeats || pendingId !== null}
                        onClick={() => enroll(offering.id)}
                        type="button"
                      >
                        {pendingId === offering.id ? 'Inscribiendo...' : 'Inscribirme'}
                      </button>
                    )}
                  </article>
                )
              })}
              {offerings.length === 0 && (
                <p className="course-empty">No hay ofertas disponibles para esta gestión.</p>
              )}
            </div>
          </>
        )}
      </section>
      {!isLoading && (
        // Remounting on enrollment changes reloads the history.
        <AcademicHistory key={enrollments.map((item) => item.id).join()} />
      )}
    </>
  )
}
