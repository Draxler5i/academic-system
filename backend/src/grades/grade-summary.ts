export const passingScore = 51;

export interface WeightedScore {
  score: number;
  weight: number;
}

export type GradeStatus = 'PASSED' | 'FAILED' | 'IN_PROGRESS';

export interface GradeSummary {
  evaluatedWeight: number;
  // Accumulated points over the full course (0-100); missing evaluations count as zero.
  finalScore: number;
  status: GradeStatus;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function summarizeGrades(grades: WeightedScore[]): GradeSummary {
  const evaluatedWeight = grades.reduce((total, grade) => total + grade.weight, 0);
  const finalScore = round(
    grades.reduce((total, grade) => total + (grade.score * grade.weight) / 100, 0),
  );

  let status: GradeStatus = 'IN_PROGRESS';
  if (evaluatedWeight >= 100) {
    status = finalScore >= passingScore ? 'PASSED' : 'FAILED';
  }

  return { evaluatedWeight, finalScore, status };
}
