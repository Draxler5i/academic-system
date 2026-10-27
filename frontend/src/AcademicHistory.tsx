import { useEffect, useState } from 'react'
import { authRequest, errorMessage, gradeStatusLabels, periodLabels } from './api'
import type { HistoryEntry } from './api'
import { GradeSummaryBadge, GradeTable } from './GradeDisplay'

export function AcademicHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    authRequest<HistoryEntry[]>('/grades/me')
      .then((data) => {
        if (isCurrent) setHistory(data)
      })
      .catch((reason: unknown) => {
        if (isCurrent) setError(errorMessage(reason, 'No fue posible cargar el historial.'))
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <section className="student-courses" aria-labelledby="history-title">
      <div className="courses-heading">
        <div>
          <p className="eyebrow">NOTAS Y CALIFICACIONES</p>
          <h2 id="history-title">Historial académico</h2>
        </div>
        <span className="enrollment-count">{history.length} cursos</span>
      </div>

      {error && (
        <p className="course-feedback course-feedback-error" role="alert">{error}</p>
      )}

      {isLoading ? (
        <p className="course-empty" role="status">Cargando historial...</p>
      ) : history.length === 0 ? (
        <p className="course-empty">Aún no tienes cursos en tu historial.</p>
      ) : (
        <div className="course-list">
          {history.map((entry) => {
            const offering = entry.courseOffering
            return (
              <article className="grade-card" key={entry.id}>
                <div className="grade-card-header">
                  <div className="course-item-main">
                    <span className="course-code">{offering.subject.code}</span>
                    <h4>{offering.subject.name}</h4>
                    <p>
                      {periodLabels[offering.period]} {offering.year}
                      {' · Paralelo '}{offering.section}
                      {offering.teacher && ` · ${offering.teacher.name}`}
                    </p>
                  </div>
                  <GradeSummaryBadge summary={entry.summary} />
                </div>
                {entry.grades.length === 0 ? (
                  <p className="grade-empty">Sin notas registradas.</p>
                ) : (
                  <GradeTable grades={entry.grades} />
                )}
              </article>
            )
          })}
        </div>
      )}
      <p className="grade-footnote">
        El estado pasa a {gradeStatusLabels.PASSED.toLowerCase()} o{' '}
        {gradeStatusLabels.FAILED.toLowerCase()} cuando se evalúa el 100 % del curso.
      </p>
    </section>
  )
}
