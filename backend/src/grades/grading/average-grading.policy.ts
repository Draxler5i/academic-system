import { GradingPolicy } from './grading-policy.js';
import type { WeightedScore } from './grading-policy.js';

/** Plain arithmetic mean of the recorded grades; weights only mark when the course is fully evaluated. */
export class AverageGradingPolicy extends GradingPolicy {
  protected computeScore(grades: WeightedScore[]) {
    if (grades.length === 0) return 0;
    return grades.reduce((total, grade) => total + grade.score, 0) / grades.length;
  }
}
