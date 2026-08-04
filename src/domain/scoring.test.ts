import { describe, expect, it } from "vitest";
import { analyzeQuestionItems, analyzeScoreDistribution, evaluateStage, scoreAdaptiveAssessment, scoreAssessment, selectStageQuestions } from "./scoring";
import { questions } from "./questions";
import type { AssessmentQuestion } from "./types";

type Score = 0 | 1 | 2 | 3;

function questionPool(): AssessmentQuestion[] {
  return Array.from({ length: 8 }, (_, levelIndex) => Array.from({ length: 8 }, (_, questionIndex) => {
    const id = `l${levelIndex + 1}-q${questionIndex + 1}`;
    return {
      id,
      level: levelIndex + 1,
      dimension: (["office", "scenario", "workflow", "innovation"] as const)[levelIndex % 4],
      category: `category-${questionIndex}`,
      prompt: `level ${levelIndex + 1} question ${questionIndex + 1}`,
      options: ([0, 1, 2, 3] as const).map((score) => ({ id: `${id}-option-${score}`, label: `option ${score}`, score }))
    };
  })).flat();
}

function stageAnswers(stage: AssessmentQuestion[], scores: Score[]): Record<string, string> {
  return Object.fromEntries(scores.map((score, index) => [stage[index].id, `${stage[index].id}-option-${score}`]));
}

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

describe("adaptive stage selection", () => {
  it("selects five stable, unique questions for one participant and level", () => {
    const pool = questionPool();
    const selected = selectStageQuestions(pool, 3, "participant-a:v3.0");

    expect(selected).toHaveLength(5);
    expect(new Set(selected.map((question) => question.id)).size).toBe(5);
    expect(selected.every((question) => question.level === 3)).toBe(true);
    expect(selectStageQuestions(pool, 3, "participant-a:v3.0")).toEqual(selected);
    expect(selectStageQuestions(pool, 3, "participant-b:v3.0").map((question) => question.id)).not.toEqual(selected.map((question) => question.id));
  });

  it("decides clear three-answer stages and extends mixed evidence to five", () => {
    const stage = selectStageQuestions(questionPool(), 1, "participant-a:v3.0");

    expect(evaluateStage(stage, stageAnswers(stage, [2, 2]))).toMatchObject({ status: "incomplete", questionCount: 2 });
    expect(evaluateStage(stage, stageAnswers(stage, [2, 3, 2]))).toMatchObject({ status: "passed", questionCount: 3, totalScore: 7 });
    expect(evaluateStage(stage, stageAnswers(stage, [0, 1, 1]))).toMatchObject({ status: "failed", questionCount: 3, totalScore: 2 });
    expect(evaluateStage(stage, stageAnswers(stage, [3, 1, 2]))).toMatchObject({ status: "needs-more", questionCount: 3, totalScore: 6 });
    expect(evaluateStage(stage, stageAnswers(stage, [3, 1, 2, 2, 2]))).toMatchObject({ status: "passed", questionCount: 5, totalScore: 10 });
    expect(evaluateStage(stage, stageAnswers(stage, [3, 1, 2, 1, 1]))).toMatchObject({ status: "failed", questionCount: 5, totalScore: 8 });
  });
});

describe("adaptive assessment scoring", () => {
  it("returns L0 and leaves unattempted dimensions unassessed when L1 fails", () => {
    const pool = questionPool();
    const stage = selectStageQuestions(pool, 1, "participant-a:v3.0");
    const result = scoreAdaptiveAssessment(stageAnswers(stage, [0, 1, 1]), 120, pool, "participant-a:v3.0");

    expect(result.level).toBe(0);
    expect(result.grade.code).toBe("L0");
    expect(result.answeredQuestionCount).toBe(3);
    expect(result.stoppedAtLevel).toBe(1);
    expect(result.stageResults).toHaveLength(1);
    expect(result.dimensionScores.office).toBe(22);
    expect(result.dimensionScores.scenario).toBeNull();
  });

  it("uses the highest passed stage and rejects unfinished adaptive paths", () => {
    const pool = questionPool();
    const seed = "participant-b:v3.0";
    const levelOne = selectStageQuestions(pool, 1, seed);
    const levelTwo = selectStageQuestions(pool, 2, seed);
    const answers = { ...stageAnswers(levelOne, [2, 2, 3]), ...stageAnswers(levelTwo, [1, 0, 1]) };

    expect(scoreAdaptiveAssessment(answers, 180, pool, seed)).toMatchObject({ level: 1, stoppedAtLevel: 2, answeredQuestionCount: 6 });
    expect(() => scoreAdaptiveAssessment(stageAnswers(levelOne, [2, 2, 3]), 90, pool, seed)).toThrow("测评尚未完成");
  });

  it("reaches L8 with 24 strong answers and requires review", () => {
    const pool = questionPool();
    const seed = "participant-c:v3.0";
    const answers = Object.assign({}, ...Array.from({ length: 8 }, (_, index) => {
      const stage = selectStageQuestions(pool, index + 1, seed);
      return stageAnswers(stage, [2, 2, 2]);
    }));
    const result = scoreAdaptiveAssessment(answers, 600, pool, seed);

    expect(result.level).toBe(8);
    expect(result.answeredQuestionCount).toBe(24);
    expect(result.stageResults).toHaveLength(8);
    expect(result.reviewRequired).toBe(true);
  });

  it("marks threshold and overly rapid results as low confidence", () => {
    const pool = questionPool();
    const seed = "participant-d:v3.0";
    const stage = selectStageQuestions(pool, 1, seed);
    const threshold = stageAnswers(stage, [3, 1, 2, 2, 2]);
    const failedNextStage = stageAnswers(selectStageQuestions(pool, 2, seed), [1, 1, 0]);

    expect(scoreAdaptiveAssessment({ ...threshold, ...failedNextStage }, 300, pool, seed).confidence).toBe("low");
    expect(scoreAdaptiveAssessment(stageAnswers(stage, [0, 0, 0]), 10, pool, seed).confidence).toBe("low");
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
