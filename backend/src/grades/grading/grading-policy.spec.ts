import { ConfigService } from '@nestjs/config';
import { AverageGradingPolicy } from './average-grading.policy.js';
import { createGradingPolicy } from './grading-policy.factory.js';
import { WeightedGradingPolicy } from './weighted-grading.policy.js';

describe('WeightedGradingPolicy', () => {
  const policy = new WeightedGradingPolicy(51);

  it('keeps a course in progress until all the weight is evaluated', () => {
    expect(policy.summarize([{ score: 80, weight: 30 }])).toEqual({
      evaluatedWeight: 30,
      finalScore: 24,
      passingScore: 51,
      status: 'IN_PROGRESS',
    });
  });

  it('passes a fully evaluated course with a weighted score of at least 51', () => {
    const summary = policy.summarize([
      { score: 60, weight: 40 },
      { score: 45, weight: 60 },
    ]);
    expect(summary.finalScore).toBe(51);
    expect(summary.status).toBe('PASSED');
  });

  it('fails a fully evaluated course below the passing score', () => {
    expect(
      policy.summarize([
        { score: 50.5, weight: 50 },
        { score: 40, weight: 50 },
      ]).status,
    ).toBe('FAILED');
  });

  it('returns zeros for a course without grades', () => {
    expect(policy.summarize([])).toMatchObject({
      evaluatedWeight: 0,
      finalScore: 0,
      status: 'IN_PROGRESS',
    });
  });
});

describe('AverageGradingPolicy', () => {
  it('uses the arithmetic mean of the recorded grades', () => {
    const summary = new AverageGradingPolicy(51).summarize([
      { score: 90, weight: 20 },
      { score: 40, weight: 80 },
    ]);
    expect(summary.finalScore).toBe(65);
    expect(summary.status).toBe('PASSED');
  });
});

describe('createGradingPolicy', () => {
  const configWith = (values: Record<string, string>) =>
    new ConfigService(values);

  it('defaults to the weighted policy with a passing score of 51', () => {
    const policy = createGradingPolicy(configWith({}));
    expect(policy).toBeInstanceOf(WeightedGradingPolicy);
    expect(policy.passingScore).toBe(51);
  });

  it('builds the configured policy and passing score', () => {
    const policy = createGradingPolicy(
      configWith({ GRADING_POLICY: 'average', PASSING_SCORE: '60' }),
    );
    expect(policy).toBeInstanceOf(AverageGradingPolicy);
    expect(policy.passingScore).toBe(60);
  });

  it('rejects unknown policies and invalid passing scores', () => {
    expect(() => createGradingPolicy(configWith({ GRADING_POLICY: 'curve' }))).toThrow(
      'GRADING_POLICY',
    );
    expect(() => createGradingPolicy(configWith({ PASSING_SCORE: '150' }))).toThrow(
      'PASSING_SCORE',
    );
  });
});
