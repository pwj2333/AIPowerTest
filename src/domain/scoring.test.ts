import { describe, expect, it } from "vitest";
import { analyzeQuestionItems, analyzeScoreDistribution, scoreAssessment } from "./scoring";
import { questions } from "./questions";

type Score = 0 | 1 | 2 | 3;

function answersByLevel(levelScores: Score[]): Record<string, string> {
  const questionsPerLevel = [2, 3, 3, 3, 3, 2, 2, 2];
  let questionNumber = 1;
  return Object.fromEntries(questionsPerLevel.flatMap((count, levelIndex) => Array.from({ length: count }, () => {
    const questionId = `q${questionNumber++}`;
    const score = levelScores[levelIndex];
    return [questionId, `${questionId}-option-${score}`];
  })));
}

describe("scoreAssessment", () => {
  it("keeps a very low raw score at L1", () => {
    const result = scoreAssessment(answersByLevel([0, 0, 0, 0, 0, 0, 0, 0]), 600);
    expect(result.level).toBe(1);
    expect(result.scorePercent).toBe(0);
  });

  it("maps a consistent middle response to the middle of the scale", () => {
    const result = scoreAssessment(answersByLevel([2, 2, 2, 2, 2, 2, 2, 2]), 600);
    expect(result.level).toBe(5);
    expect(result.grade.name).toBe("钻石级");
    expect(result.scorePercent).toBe(67);
  });

  it("uses evidence across all items instead of a single blocking gate", () => {
    const result = scoreAssessment(answersByLevel([3, 3, 3, 0, 3, 3, 3, 3]), 600);
    expect(result.level).toBe(7);
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

describe("analyzeScoreDistribution", () => {
  it("waits for 30 responses before judging distribution shape", () => {
    expect(analyzeScoreDistribution([40, 50, 60]).status).toBe("insufficient");
  });

  it("recognizes a sufficiently dispersed symmetric sample", () => {
    const sample = [30, 35, 35, 40, 40, 40, 45, 45, 45, 45, 45, 50, 50, 50, 50, 50, 50, 50, 50, 50, 55, 55, 55, 55, 55, 60, 60, 60, 65, 65, 70];
    expect(analyzeScoreDistribution(sample).status).toBe("approximately-normal");
  });
});

describe("analyzeQuestionItems", () => {
  it("waits for 30 complete responses before flagging an item", () => {
    const responses = Array.from({ length: 29 }, (_, responseIndex) => Object.fromEntries(questions.map((question, questionIndex) => [question.id, `${question.id}-option-${(responseIndex + questionIndex) % 4}`])));
    expect(analyzeQuestionItems(responses, questions)[0].status).toBe("insufficient");
  });

  it("flags a question when every respondent selects the top score", () => {
    const responses = Array.from({ length: 30 }, (_, responseIndex) => Object.fromEntries(questions.map((question, questionIndex) => [question.id, `${question.id}-option-${questionIndex === 0 ? 3 : (responseIndex + questionIndex) % 4}`])));
    const [firstQuestion] = analyzeQuestionItems(responses, questions);
    expect(firstQuestion.status).toBe("too-easy");
    expect(firstQuestion.optionCounts).toEqual([0, 0, 0, 30]);
  });
});
