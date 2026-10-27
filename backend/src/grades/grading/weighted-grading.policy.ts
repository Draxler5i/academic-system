import { GradingPolicy } from './grading-policy.js';
import type { WeightedScore } from './grading-policy.js';

/** Accumulated points: each grade contributes score × weight %. Missing evaluations count as zero. */
export class WeightedGradingPolicy extends GradingPolicy {
  protected computeScore(grades: WeightedScore[]) {
    return grades.reduce((total, grade) => total + (grade.score * grade.weight) / 100, 0);
  }
}
