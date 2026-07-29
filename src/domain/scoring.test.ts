import { describe, expect, it } from "vitest";
import { scoreAssessment } from "./scoring";

type Score = 0 | 1 | 2 | 3;

function answersByLevel(levelScores: Score[]): Record<string, string> {
  const questionsPerLevel = [2, 3, 3, 3, 3, 2, 2, 2];
  let questionNumber = 1;

  return Object.fromEntries(
    questionsPerLevel.flatMap((count, levelIndex) =>
      Array.from({ length: count }, () => {
        const questionId = `q${questionNumber++}`;
        const score = levelScores[levelIndex];
        return [questionId, `${questionId}-option-${score}`];
      }),
    ),
  );
}

describe("scoreAssessment", () => {
  it("keeps an employee at L1 when the L2 gate is not met", () => {
    const result = scoreAssessment(answersByLevel([1, 1, 3, 3, 3, 3, 3, 3]), 600);

    expect(result.level).toBe(1);
  });

  it("awards L3 when the first three sequential gates are met", () => {
    const result = scoreAssessment(answersByLevel([2, 2, 2, 1, 0, 0, 0, 0]), 600);

    expect(result.level).toBe(3);
    expect(result.grade.name).toBe("黄金级");
  });

  it("prevents later high scores from bypassing a failed L4 gate", () => {
    const result = scoreAssessment(answersByLevel([3, 3, 3, 1, 3, 3, 3, 3]), 600);

    expect(result.level).toBe(3);
  });

  it("marks rapid straight-line responses as low confidence", () => {
    const result = scoreAssessment(answersByLevel([0, 0, 0, 0, 0, 0, 0, 0]), 120);

    expect(result.confidence).toBe("low");
    expect(result.reviewRequired).toBe(false);
  });

  it("requires review for high-level results even with high confidence", () => {
    const result = scoreAssessment(answersByLevel([3, 3, 3, 3, 3, 3, 3, 3]), 600);

    expect(result.level).toBe(8);
    expect(result.reviewRequired).toBe(true);
  });
});
