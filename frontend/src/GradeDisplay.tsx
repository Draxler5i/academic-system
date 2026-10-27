import { gradeStatusLabels } from './api'
import type { Grade, GradeSummary } from './api'

export function GradeSummaryBadge({ summary }: { summary: GradeSummary }) {
  return (
    <div className="grade-summary">
      <strong>{summary.finalScore}</strong>
      <span>
        de 100 · mín. {summary.passingScore} · {summary.evaluatedWeight} % evaluado
      </span>
      <span className={`grade-status grade-status-${summary.status.toLowerCase()}`}>
        {gradeStatusLabels[summary.status]}
      </span>
    </div>
  )
}

export function GradeTable({ grades }: { grades: Grade[] }) {
  return (
    <table className="grade-table">
      <thead>
        <tr>
          <th>Evaluación</th>
          <th>Ponderación</th>
          <th>Nota</th>
        </tr>
      </thead>
      <tbody>
        {grades.map((grade) => (
          <tr key={grade.id}>
            <td>
              {grade.title}
              {grade.comment && <small>{grade.comment}</small>}
            </td>
            <td>{grade.weight} %</td>
            <td>{grade.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
