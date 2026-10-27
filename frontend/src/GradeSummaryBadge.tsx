import { gradeStatusLabels } from './api'
import type { GradeSummary } from './api'

export function GradeSummaryBadge({ summary }: { summary: GradeSummary }) {
  return (
    <div className="grade-summary">
      <strong>{summary.finalScore}</strong>
      <span>de 100 · {summary.evaluatedWeight} % evaluado</span>
      <span className={`grade-status grade-status-${summary.status.toLowerCase()}`}>
        {gradeStatusLabels[summary.status]}
      </span>
    </div>
  )
}
