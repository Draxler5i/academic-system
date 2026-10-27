export interface WeightedScore {
  score: number;
  weight: number;
}

export type GradeStatus = 'PASSED' | 'FAILED' | 'IN_PROGRESS';

export interface GradeSummary {
  evaluatedWeight: number;
  finalScore: number;
  passingScore: number;
  status: GradeStatus;
}

/**
 * Strategy for turning a course's grades into a final score and status.
 * Declared as an abstract class so it doubles as the Nest injection token.
 */
export abstract class GradingPolicy {
  constructor(readonly passingScore: number) {}

  summarize(grades: WeightedScore[]): GradeSummary {
    const evaluatedWeight = grades.reduce((total, grade) => total + grade.weight, 0);
    const finalScore = round(this.computeScore(grades));

    let status: GradeStatus = 'IN_PROGRESS';
    if (evaluatedWeight >= 100) {
      status = finalScore >= this.passingScore ? 'PASSED' : 'FAILED';
    }

    return { evaluatedWeight, finalScore, passingScore: this.passingScore, status };
  }

  protected abstract computeScore(grades: WeightedScore[]): number;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
