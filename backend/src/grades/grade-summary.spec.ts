import { summarizeGrades } from './grade-summary.js';

describe('summarizeGrades', () => {
  it('keeps a course in progress until all the weight is evaluated', () => {
    expect(summarizeGrades([{ score: 80, weight: 30 }])).toEqual({
      evaluatedWeight: 30,
      finalScore: 24,
      status: 'IN_PROGRESS',
    });
  });

  it('passes a course with a weighted score of at least 51', () => {
    expect(
      summarizeGrades([
        { score: 60, weight: 40 },
        { score: 45, weight: 60 },
      ]),
    ).toEqual({ evaluatedWeight: 100, finalScore: 51, status: 'PASSED' });
  });

  it('fails a fully evaluated course below the passing score', () => {
    expect(
      summarizeGrades([
        { score: 50.5, weight: 50 },
        { score: 40, weight: 50 },
      ]).status,
    ).toBe('FAILED');
  });

  it('returns zeros for a course without grades', () => {
    expect(summarizeGrades([])).toEqual({
      evaluatedWeight: 0,
      finalScore: 0,
      status: 'IN_PROGRESS',
    });
  });
});
