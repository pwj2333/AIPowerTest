import { getGrade, questions as defaultQuestions } from "./questions";
import type { AbilityDimension, AnswerMap, AssessmentQuestion, AssessmentResult, StageResult } from "./types";

const dimensions: AbilityDimension[] = ["office", "scenario", "workflow", "innovation"];
const lowConfidenceSeconds = 180;

function average(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

function stableOrder<T>(items: T[], seed: string): T[] {
  const ordered = [...items];
  let state = [...seed].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  }
  return ordered;
}

export function selectStageQuestions(questions: AssessmentQuestion[], level: number, seed: string): AssessmentQuestion[] {
  return stableOrder(questions.filter((question) => question.level === level), `${seed}:L${level}`).slice(0, 5);
}

export type StageStatus = "incomplete" | "needs-more" | "passed" | "failed";

export interface StageEvaluation {
  status: StageStatus;
  questionCount: number;
  totalScore: number;
}

export function evaluateStage(stage: AssessmentQuestion[], answers: AnswerMap): StageEvaluation {
  const score = (question: AssessmentQuestion) => question.options.find((option) => option.id === answers[question.id])?.score;
  const firstScores = stage.slice(0, 3).map(score);
  const firstAnswered = firstScores.filter((value): value is 0 | 1 | 2 | 3 => value !== undefined);
  if (firstAnswered.length < 3) {
    return { status: "incomplete", questionCount: firstAnswered.length, totalScore: firstAnswered.reduce<number>((total, value) => total + value, 0) };
  }
  const firstTotal = firstAnswered.reduce<number>((total, value) => total + value, 0);
  if (firstAnswered.every((value) => value >= 2)) return { status: "passed", questionCount: 3, totalScore: firstTotal };
  if (firstAnswered.every((value) => value <= 1)) return { status: "failed", questionCount: 3, totalScore: firstTotal };

  const allScores = stage.slice(0, 5).map(score);
  const allAnswered = allScores.filter((value): value is 0 | 1 | 2 | 3 => value !== undefined);
  if (allAnswered.length < 5) return { status: "needs-more", questionCount: allAnswered.length, totalScore: allAnswered.reduce<number>((total, value) => total + value, 0) };
  const totalScore = allAnswered.reduce<number>((total, value) => total + value, 0);
  return { status: totalScore >= 10 ? "passed" : "failed", questionCount: 5, totalScore };
}

export interface DistributionDiagnostics {
  sampleSize: number;
  mean: number;
  standardDeviation: number;
  skewness: number;
  excessKurtosis: number;
  jarqueBera: number;
  bins: number[];
  status: "insufficient" | "concentrated" | "skewed" | "approximately-normal";
}

export function analyzeScoreDistribution(values: number[]): DistributionDiagnostics {
  const scores = values.filter(Number.isFinite).map((score) => Math.max(0, Math.min(100, score)));
  const mean = average(scores);
  const variance = average(scores.map((score) => (score - mean) ** 2));
  const standardDeviation = Math.sqrt(variance);
  const skewness = standardDeviation ? average(scores.map((score) => ((score - mean) / standardDeviation) ** 3)) : 0;
  const excessKurtosis = standardDeviation ? average(scores.map((score) => ((score - mean) / standardDeviation) ** 4)) - 3 : 0;
  const jarqueBera = scores.length ? (scores.length / 6) * ((skewness ** 2) + ((excessKurtosis ** 2) / 4)) : 0;
  const bins = Array.from({ length: 5 }, (_, index) => scores.filter((score) => Math.min(4, Math.floor(score / 20)) === index).length);
  const status = scores.length < 30
    ? "insufficient"
    : standardDeviation < 8
      ? "concentrated"
      : jarqueBera > 5.99
        ? "skewed"
        : "approximately-normal";
  return {
    sampleSize: scores.length,
    mean: Math.round(mean * 10) / 10,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    skewness: Math.round(skewness * 100) / 100,
    excessKurtosis: Math.round(excessKurtosis * 100) / 100,
    jarqueBera: Math.round(jarqueBera * 100) / 100,
    bins,
    status
  };
}

export type ItemQualityStatus = "insufficient" | "too-easy" | "too-hard" | "low-discrimination" | "healthy";

export interface ItemDiagnostics {
  questionId: string;
  sampleSize: number;
  meanScore: number;
  facility: number;
  discrimination: number;
  optionCounts: number[];
  status: ItemQualityStatus;
}

function correlation(left: number[], right: number[]): number {
  if (left.length < 2 || left.length !== right.length) return 0;
  const leftMean = average(left);
  const rightMean = average(right);
  const numerator = left.reduce((total, value, index) => total + ((value - leftMean) * (right[index] - rightMean)), 0);
  const denominator = Math.sqrt(
    left.reduce((total, value) => total + ((value - leftMean) ** 2), 0)
    * right.reduce((total, value) => total + ((value - rightMean) ** 2), 0),
  );
  return denominator ? numerator / denominator : 0;
}

export function analyzeQuestionItems(responses: AnswerMap[], questions: AssessmentQuestion[]): ItemDiagnostics[] {
  return questions.map((question) => {
    const scored = responses.flatMap((answers) => {
      const selected = question.options.find((option) => option.id === answers[question.id]);
      if (!selected) return [];
      const restScores = questions
        .filter((item) => item.id !== question.id)
        .map((item) => item.options.find((option) => option.id === answers[item.id])?.score);
      if (restScores.some((score) => score === undefined)) return [];
      return [{ itemScore: selected.score, restScore: restScores.reduce<number>((total, score) => total + (score ?? 0), 0) }];
    });
    const itemScores = scored.map((item) => item.itemScore);
    const restScores = scored.map((item) => item.restScore);
    const meanScore = average(itemScores);
    const facility = meanScore / 3;
    const discrimination = correlation(itemScores, restScores);
    const optionCounts = [0, 1, 2, 3].map((score) => itemScores.filter((value) => value === score).length);
    const status: ItemQualityStatus = scored.length < 30
      ? "insufficient"
      : facility >= 0.85
        ? "too-easy"
        : facility <= 0.15
          ? "too-hard"
          : discrimination < 0.2
            ? "low-discrimination"
            : "healthy";
    return {
      questionId: question.id,
      sampleSize: scored.length,
      meanScore: Math.round(meanScore * 100) / 100,
      facility: Math.round(facility * 100) / 100,
      discrimination: Math.round(discrimination * 100) / 100,
      optionCounts,
      status
    };
  });
}

export function scoreAssessment(answers: AnswerMap, elapsedSeconds: number, questions: AssessmentQuestion[] = defaultQuestions): AssessmentResult {
  if (questions.length === 100 && Object.keys(answers).length === 20 && Object.keys(answers).every((id) => /^q\d+$/.test(id))) {
    return scoreLegacyTwentyQuestionAssessment(answers, elapsedSeconds, questions);
  }
  const scoredAnswers = questions.map((question) => {
    const chosenOption = question.options.find((option) => option.id === answers[question.id]);
    return { question, score: chosenOption?.score ?? 0 };
  });

  const levelAverages = Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => {
      const level = index + 1;
      return [level, average(scoredAnswers.filter(({ question }) => question.level === level).map(({ score }) => score))];
    }),
  ) as Record<number, number>;

  const selectedScores = scoredAnswers.map(({ score }) => score);
  const totalScore = selectedScores.reduce<number>((total, score) => total + score, 0);
  const maxScore = questions.length * 3;
  const scorePercent = Math.round((totalScore / maxScore) * 100);
  // ponytail: fixed cuts are provisional until a representative sample supports item-response calibration.
  const level = [25, 37, 49, 61, 71, 81, 91].filter((threshold) => scorePercent >= threshold).length + 1;

  const dimensionScores = Object.fromEntries(
    dimensions.map((dimension) => {
      const scores = scoredAnswers.filter(({ question }) => question.dimension === dimension).map(({ score }) => score);
      return [dimension, Math.round((average(scores) / 3) * 100)];
    }),
  ) as Record<AbilityDimension, number>;

  const repeatedScoreCount = Math.max(...[0, 1, 2, 3].map((score) => selectedScores.filter((value) => value === score).length));
  const foundationAverage = average([levelAverages[1], levelAverages[2], levelAverages[3]]);
  const advancedAverage = average([levelAverages[5], levelAverages[6], levelAverages[7], levelAverages[8]]);
  const contradiction = foundationAverage < 1.5 && advancedAverage >= 2.5;
  const confidence = elapsedSeconds < Math.max(lowConfidenceSeconds, questions.length * 9) || repeatedScoreCount / questions.length > 0.75 || contradiction ? "low" : "high";

  const weakDimensions = [...dimensions].sort((left, right) => dimensionScores[left] - dimensionScores[right]).slice(0, 2);

  return {
    level,
    grade: getGrade(level),
    totalScore,
    maxScore,
    scorePercent,
    levelAverages,
    dimensionScores,
    weakDimensions,
    confidence,
    reviewRequired: level >= 6,
    completedAt: new Date().toISOString()
  };
}

function scoreLegacyTwentyQuestionAssessment(answers: AnswerMap, elapsedSeconds: number, questions: AssessmentQuestion[]): AssessmentResult {
  // ponytail: this branch only keeps v2 answer exports readable; all new submissions use the adaptive engine.
  const orderedIds = Object.keys(answers).sort();
  const scores = orderedIds.map((questionId) => {
    const normalizedId = `q${questionId.slice(1).padStart(3, "0")}`;
    const question = questions.find((candidate) => candidate.id === questionId || candidate.id === normalizedId);
    const legacyScore = Number(answers[questionId].split("-").at(-1));
    return question?.options.find((option) => option.score === legacyScore)?.score ?? 0;
  });
  const levelCounts = [2, 3, 3, 3, 3, 2, 2, 2];
  const levelAverages: Partial<Record<number, number>> = {};
  let cursor = 0;
  levelCounts.forEach((count, index) => {
    levelAverages[index + 1] = average(scores.slice(cursor, cursor + count));
    cursor += count;
  });
  const totalScore = scores.reduce<number>((total, score) => total + score, 0);
  const maxScore = scores.length * 3;
  const scorePercent = Math.round((totalScore / maxScore) * 100);
  const level = [25, 37, 49, 61, 71, 81, 91].filter((threshold) => scorePercent >= threshold).length + 1;
  const dimensionScores = Object.fromEntries(dimensions.map((dimension, index) => {
    const values = scores.filter((_, scoreIndex) => scoreIndex % dimensions.length === index);
    return [dimension, Math.round((average(values) / 3) * 100)];
  })) as Record<AbilityDimension, number | null>;
  const repeatedScoreCount = Math.max(...[0, 1, 2, 3].map((score) => scores.filter((value) => value === score).length));
  const confidence = elapsedSeconds < Math.max(lowConfidenceSeconds, scores.length * 9) || repeatedScoreCount / scores.length > 0.75 ? "low" : "high";
  const weakDimensions = [...dimensions].sort((left, right) => (dimensionScores[left] ?? 0) - (dimensionScores[right] ?? 0)).slice(0, 2);
  return {
    level,
    grade: getGrade(level),
    totalScore,
    maxScore,
    scorePercent,
    levelAverages,
    dimensionScores,
    weakDimensions,
    confidence,
    reviewRequired: level >= 6,
    completedAt: new Date().toISOString()
  };
}

export function scoreAdaptiveAssessment(
  answers: AnswerMap,
  elapsedSeconds: number,
  questions: AssessmentQuestion[] = defaultQuestions,
  seed = "assessment",
): AssessmentResult {
  const stageResults: StageResult[] = [];
  const answeredQuestions: AssessmentQuestion[] = [];
  let level = 0;

  for (let stageLevel = 1; stageLevel <= 8; stageLevel += 1) {
    const stage = selectStageQuestions(questions, stageLevel, seed);
    if (stage.length < 5) throw new Error(`L${stageLevel} 题目不足 5 道`);
    const evaluation = evaluateStage(stage, answers);
    if (evaluation.status === "incomplete" || evaluation.status === "needs-more") throw new Error("测评尚未完成");
    const attempted = stage.slice(0, evaluation.questionCount);
    answeredQuestions.push(...attempted);
    stageResults.push({
      level: stageLevel,
      questionIds: attempted.map((question) => question.id),
      questionCount: evaluation.questionCount,
      totalScore: evaluation.totalScore,
      status: evaluation.status,
    });
    if (evaluation.status === "failed") break;
    level = stageLevel;
  }

  const finalStage = stageResults.at(-1);
  if (!finalStage || (finalStage.status === "passed" && level < 8)) throw new Error("测评尚未完成");

  const scores = answeredQuestions.map((question) => question.options.find((option) => option.id === answers[question.id])!.score);
  const totalScore = scores.reduce<number>((total, score) => total + score, 0);
  const maxScore = scores.length * 3;
  const levelAverages = Object.fromEntries(stageResults.map((stage) => [stage.level, stage.totalScore / stage.questionCount]));
  const dimensionScores = Object.fromEntries(dimensions.map((dimension) => {
    const dimensionQuestions = answeredQuestions.filter((question) => question.dimension === dimension);
    if (!dimensionQuestions.length) return [dimension, null];
    const dimensionValues = dimensionQuestions.map((question) => question.options.find((option) => option.id === answers[question.id])!.score);
    return [dimension, Math.round((average(dimensionValues) / 3) * 100)];
  })) as Record<AbilityDimension, number | null>;
  const weakDimensions = dimensions
    .filter((dimension) => dimensionScores[dimension] !== null)
    .sort((left, right) => dimensionScores[left]! - dimensionScores[right]!)
    .slice(0, 2);
  const boundary = stageResults.some((stage) => stage.questionCount === 5 && (stage.totalScore === 9 || stage.totalScore === 10));
  const confidence = elapsedSeconds < answeredQuestions.length * 9 || boundary ? "low" : "high";

  return {
    level,
    grade: getGrade(level),
    totalScore,
    maxScore,
    scorePercent: Math.round((totalScore / maxScore) * 100),
    levelAverages,
    dimensionScores,
    weakDimensions,
    answeredQuestionCount: answeredQuestions.length,
    stoppedAtLevel: finalStage.level,
    stageResults,
    confidence,
    reviewRequired: level >= 6,
    completedAt: new Date().toISOString(),
  };
}
