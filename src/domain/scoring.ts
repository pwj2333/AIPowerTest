import { getGrade, questions as defaultQuestions } from "./questions";
import type { AbilityDimension, AnswerMap, AssessmentQuestion, AssessmentResult } from "./types";

const dimensions: AbilityDimension[] = ["office", "scenario", "workflow", "innovation"];
const lowConfidenceSeconds = 180;

function average(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
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
