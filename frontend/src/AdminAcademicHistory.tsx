import { useEffect, useState } from 'react'
import { authRequest, errorMessage, periodLabels } from './api'
import type { AcademicPeriod, CourseOffering, Subject, StudentHistoryEntry } from './api'
import { GradeSummaryBadge, GradeTable } from './GradeDisplay'

interface Filters {
  year: string
  period: '' | AcademicPeriod
  subjectId: string
  courseOfferingId: string
  search: string
}

const emptyFilters: Filters = {
  year: '',
  period: '',
  subjectId: '',
  courseOfferingId: '',
  search: '',
}

function offeringLabel(offering: CourseOffering) {
  return `${offering.subject.code} · ${offering.subject.name} · ${
    periodLabels[offering.period]
  } ${offering.year} · Paralelo ${offering.section}`
}

export function AdminAcademicHistory() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [offerings, setOfferings] = useState<CourseOffering[]>([])
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [search, setSearch] = useState('')
  const [history, setHistory] = useState<StudentHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      authRequest<Subject[]>('/subjects'),
      authRequest<CourseOffering[]>('/course-offerings'),
    ])
      .then(([subjectData, offeringData]) => {
        setSubjects(subjectData)
        setOfferings(offeringData)
      })
      .catch((reason: unknown) =>
        setError(errorMessage(reason, 'No fue posible cargar los filtros.')),
      )
  }, [])

  // Debounce the free-text search so typing does not fire a request per key.
  useEffect(() => {
    const trimmed = search.trim()
    if (trimmed === filters.search) return
    const timeout = window.setTimeout(() => {
      setIsLoading(true)
      setFilters((current) => ({ ...current, search: trimmed }))
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [search, filters.search])

  useEffect(() => {
    let isCurrent = true
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value !== ''),
    )
    authRequest<StudentHistoryEntry[]>(`/grades/history?${params}`)
      .then((data) => {
        if (!isCurrent) return
        setHistory(data)
        setError('')
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
  }, [filters])

  const years = [...new Set(offerings.map((offering) => offering.year))].sort((a, b) => b - a)
  const matchingOfferings = offerings.filter(
    (offering) =>
      (!filters.year || offering.year === Number(filters.year)) &&
      (!filters.period || offering.period === filters.period) &&
      (!filters.subjectId || offering.subject.id === filters.subjectId),
  )

  function updateFilter(field: Exclude<keyof Filters, 'search'>, value: string) {
    setIsLoading(true)
    setFilters((current) => {
      const next = { ...current, [field]: value }
      // A narrower year, period or subject can leave the selected course out of range.
      if (field !== 'courseOfferingId') next.courseOfferingId = ''
      return next
    })
  }

  function clearFilters() {
    setIsLoading(true)
    setSearch('')
    setFilters(emptyFilters)
  }

  const hasFilters = search !== '' || Object.values(filters).some((value) => value !== '')

  return (
    <section className="student-courses" aria-labelledby="admin-history-title">
      <div className="courses-heading">
        <div>
          <p className="eyebrow">NOTAS Y CALIFICACIONES</p>
          <h2 id="admin-history-title">Historial académico de estudiantes</h2>
        </div>
        <span className="enrollment-count">{history.length} registros</span>
      </div>

      <div className="history-filters">
        <label>
          Gestión
          <select onChange={(event) => updateFilter('year', event.target.value)} value={filters.year}>
            <option value="">Todas</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>
        <label>
          Periodo
          <select
            onChange={(event) => updateFilter('period', event.target.value)}
            value={filters.period}
          >
            <option value="">Todos</option>
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Materia
          <select
            onChange={(event) => updateFilter('subjectId', event.target.value)}
            value={filters.subjectId}
          >
            <option value="">Todas</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} · {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label className="history-filter-wide">
          Curso
          <select
            onChange={(event) => updateFilter('courseOfferingId', event.target.value)}
            value={filters.courseOfferingId}
          >
            <option value="">Todos</option>
            {matchingOfferings.map((offering) => (
              <option key={offering.id} value={offering.id}>{offeringLabel(offering)}</option>
            ))}
          </select>
        </label>
        <label className="history-filter-wide">
          Estudiante
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Código, nombre o apellido"
            type="search"
            value={search}
          />
        </label>
        {hasFilters && (
          <button className="link-button history-clear" onClick={clearFilters} type="button">
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <p className="course-feedback course-feedback-error" role="alert">{error}</p>
      )}

      {isLoading ? (
        <p className="course-empty" role="status">Cargando historial...</p>
      ) : history.length === 0 ? (
        <p className="course-empty">No hay registros para los filtros seleccionados.</p>
      ) : (
        <div className="course-list">
          {history.map((entry) => {
            const offering = entry.courseOffering
            return (
              <article className="grade-card" key={entry.id}>
                <div className="grade-card-header">
                  <div className="course-item-main">
                    <span className="course-code">
                      {entry.student.studentCode} · {offering.subject.code}
                    </span>
                    <h4>
                      {entry.student.lastName}, {entry.student.firstName}
                    </h4>
                    <p>
                      {offering.subject.name} · {periodLabels[offering.period]} {offering.year}
                      {' · Paralelo '}{offering.section}
                      {offering.teacher && ` · ${offering.teacher.name}`}
                    </p>
                  </div>
                  <GradeSummaryBadge summary={entry.summary} />
                </div>
                {entry.grades.length === 0 ? (
                  <p className="grade-empty">Sin notas registradas.</p>
                ) : (
                  <details className="history-details">
                    <summary>Ver {entry.grades.length} notas</summary>
                    <GradeTable grades={entry.grades} />
                  </details>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
