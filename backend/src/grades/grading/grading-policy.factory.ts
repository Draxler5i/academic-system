import { ConfigService } from '@nestjs/config';
import { AverageGradingPolicy } from './average-grading.policy.js';
import { GradingPolicy } from './grading-policy.js';
import { WeightedGradingPolicy } from './weighted-grading.policy.js';

const policies = {
  weighted: WeightedGradingPolicy,
  average: AverageGradingPolicy,
} satisfies Record<string, new (passingScore: number) => GradingPolicy>;

const defaultPassingScore = 51;

/** Factory that builds the grading strategy selected by GRADING_POLICY and PASSING_SCORE. */
export function createGradingPolicy(config: ConfigService): GradingPolicy {
  const name = config.get<string>('GRADING_POLICY') ?? 'weighted';
  if (!(name in policies)) {
    throw new Error(
      `GRADING_POLICY must be one of: ${Object.keys(policies).join(', ')}`,
    );
  }

  const passingScore = Number(
    config.get<string>('PASSING_SCORE') ?? defaultPassingScore,
  );
  if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100) {
    throw new Error('PASSING_SCORE must be a number between 0 and 100');
  }

  return new policies[name as keyof typeof policies](passingScore);
}
