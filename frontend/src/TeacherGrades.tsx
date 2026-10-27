import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { authRequest, errorMessage, periodLabels } from './api'
import type { CourseOffering, CourseRoster, Grade } from './api'
import { GradeSummaryBadge } from './GradeSummaryBadge'

interface GradeFormValues {
  title: string
  score: string
  weight: string
  comment: string
}

// The enrollment receiving a new grade, or the grade being edited.
type Editing = { enrollmentId: string; grade: Grade | null }

const emptyForm: GradeFormValues = { title: '', score: '', weight: '', comment: '' }

function GradeForm({
  initial,
  isSaving,
  onCancel,
  onSubmit,
}: {
  initial: GradeFormValues
  isSaving: boolean
  onCancel: () => void
  onSubmit: (values: GradeFormValues) => void
}) {
  const [values, setValues] = useState(initial)

  function update(field: keyof GradeFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form className="grade-form" onSubmit={handleSubmit}>
      <label>
        Evaluación
        <input
          maxLength={80}
          minLength={2}
          onChange={(event) => update('title', event.target.value)}
          placeholder="Primer parcial"
          required
          value={values.title}
        />
      </label>
      <label>
        Nota (0-100)
        <input
          max={100}
          min={0}
          onChange={(event) => update('score', event.target.value)}
          required
          step="0.01"
          type="number"
          value={values.score}
        />
      </label>
      <label>
        Ponderación %
        <input
          max={100}
          min={1}
          onChange={(event) => update('weight', event.target.value)}
          required
          step="1"
          type="number"
          value={values.weight}
        />
      </label>
      <label className="grade-form-comment">
        Comentario
        <input
          maxLength={300}
          onChange={(event) => update('comment', event.target.value)}
          placeholder="Opcional"
          value={values.comment}
        />
      </label>
      <div className="grade-form-actions">
        <button className="course-action" disabled={isSaving} type="submit">
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          className="course-action course-action-cancel"
          disabled={isSaving}
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function TeacherGrades() {
  const [offerings, setOfferings] = useState<CourseOffering[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [roster, setRoster] = useState<CourseRoster | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let isCurrent = true
    authRequest<CourseOffering[]>('/grades/teaching')
      .then((data) => {
        if (!isCurrent) return
        setOfferings(data)
        setSelectedId(data[0]?.id ?? null)
        if (data.length === 0) setIsLoading(false)
      })
      .catch((reason: unknown) => {
        if (!isCurrent) return
        setError(errorMessage(reason, 'No fue posible cargar tus cursos.'))
        setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    let isCurrent = true
    authRequest<CourseRoster>(`/grades/course-offerings/${selectedId}`)
      .then((data) => {
        if (isCurrent) setRoster(data)
      })
      .catch((reason: unknown) => {
        if (isCurrent) setError(errorMessage(reason, 'No fue posible cargar las notas.'))
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [selectedId])

  function selectOffering(id: string) {
    if (id === selectedId) return
    setIsLoading(true)
    setRoster(null)
    setEditing(null)
    setError('')
    setMessage('')
    setSelectedId(id)
  }

  async function reloadRoster() {
    if (!selectedId) return
    setRoster(await authRequest<CourseRoster>(`/grades/course-offerings/${selectedId}`))
  }

  async function runAction(action: () => Promise<unknown>, success: string, failure: string) {
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await action()
      await reloadRoster()
      setEditing(null)
      setMessage(success)
    } catch (reason) {
      setError(errorMessage(reason, failure))
    } finally {
      setIsSaving(false)
    }
  }

  function saveGrade(values: GradeFormValues) {
    if (!editing) return
    const payload = {
      title: values.title,
      score: Number(values.score),
      weight: Number(values.weight),
      comment: values.comment,
    }

    if (editing.grade) {
      void runAction(
        () =>
          authRequest(`/grades/${editing.grade?.id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }),
        'Nota actualizada.',
        'No fue posible actualizar la nota.',
      )
    } else {
      void runAction(
        () =>
          authRequest('/grades', {
            method: 'POST',
            body: JSON.stringify({ ...payload, enrollmentId: editing.enrollmentId }),
          }),
        'Nota registrada.',
        'No fue posible registrar la nota.',
      )
    }
  }

  function deleteGrade(grade: Grade) {
    if (!window.confirm(`¿Eliminar la nota "${grade.title}"?`)) return
    void runAction(
      () => authRequest(`/grades/${grade.id}`, { method: 'DELETE' }),
      'Nota eliminada.',
      'No fue posible eliminar la nota.',
    )
  }

  return (
    <section className="student-courses" aria-labelledby="teacher-grades-title">
      <div className="courses-heading">
        <div>
          <p className="eyebrow">NOTAS Y CALIFICACIONES</p>
          <h2 id="teacher-grades-title">Registro de notas</h2>
        </div>
        <span className="enrollment-count">{offerings.length} cursos asignados</span>
      </div>

      {offerings.length > 0 && (
        <div className="offering-tabs" role="tablist">
          {offerings.map((offering) => (
            <button
              aria-selected={offering.id === selectedId}
              className="offering-tab"
              key={offering.id}
              onClick={() => selectOffering(offering.id)}
              role="tab"
              type="button"
            >
              <span className="course-code">{offering.subject.code}</span>
              {offering.subject.name}
              <small>
                {periodLabels[offering.period]} {offering.year} · Paralelo {offering.section}
              </small>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="course-feedback course-feedback-error" role="alert">{error}</p>
      )}
      {message && (
        <p className="course-feedback course-feedback-success" role="status">{message}</p>
      )}

      {isLoading ? (
        <p className="course-empty" role="status">Cargando...</p>
      ) : offerings.length === 0 ? (
        <p className="course-empty">No tienes cursos asignados.</p>
      ) : roster && roster.enrollments.length === 0 ? (
        <p className="course-empty">Este curso aún no tiene estudiantes inscritos.</p>
      ) : (
        <div className="course-list">
          {roster?.enrollments.map((entry) => {
            const isAdding = editing?.enrollmentId === entry.id && !editing.grade
            return (
              <article className="grade-card" key={entry.id}>
                <div className="grade-card-header">
                  <div className="course-item-main">
                    <span className="course-code">{entry.student.studentCode}</span>
                    <h4>
                      {entry.student.lastName}, {entry.student.firstName}
                    </h4>
                  </div>
                  <GradeSummaryBadge summary={entry.summary} />
                </div>

                {entry.grades.length > 0 && (
                  <table className="grade-table">
                    <thead>
                      <tr>
                        <th>Evaluación</th>
                        <th>Ponderación</th>
                        <th>Nota</th>
                        <th aria-label="Acciones" />
                      </tr>
                    </thead>
                    <tbody>
                      {entry.grades.map((grade) =>
                        editing?.grade?.id === grade.id ? (
                          <tr key={grade.id}>
                            <td colSpan={4}>
                              <GradeForm
                                initial={{
                                  title: grade.title,
                                  score: String(grade.score),
                                  weight: String(grade.weight),
                                  comment: grade.comment ?? '',
                                }}
                                isSaving={isSaving}
                                onCancel={() => setEditing(null)}
                                onSubmit={saveGrade}
                              />
                            </td>
                          </tr>
                        ) : (
                          <tr key={grade.id}>
                            <td>
                              {grade.title}
                              {grade.comment && <small>{grade.comment}</small>}
                            </td>
                            <td>{grade.weight} %</td>
                            <td>{grade.score}</td>
                            <td className="grade-row-actions">
                              <button
                                className="link-button"
                                disabled={isSaving}
                                onClick={() => setEditing({ enrollmentId: entry.id, grade })}
                                type="button"
                              >
                                Editar
                              </button>
                              <button
                                className="link-button link-button-danger"
                                disabled={isSaving}
                                onClick={() => deleteGrade(grade)}
                                type="button"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                )}

                {isAdding ? (
                  <GradeForm
                    initial={emptyForm}
                    isSaving={isSaving}
                    onCancel={() => setEditing(null)}
                    onSubmit={saveGrade}
                  />
                ) : (
                  entry.summary.evaluatedWeight < 100 && (
                    <button
                      className="link-button grade-add"
                      disabled={isSaving}
                      onClick={() => setEditing({ enrollmentId: entry.id, grade: null })}
                      type="button"
                    >
                      + Agregar nota ({100 - entry.summary.evaluatedWeight} % disponible)
                    </button>
                  )
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
