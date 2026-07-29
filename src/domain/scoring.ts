import { getGrade, questions } from "./questions";
import type { AbilityDimension, AnswerMap, AssessmentResult } from "./types";

const dimensions: AbilityDimension[] = ["office", "scenario", "workflow", "innovation"];
const lowConfidenceSeconds = 180;

function average(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export function scoreAssessment(answers: AnswerMap, elapsedSeconds: number): AssessmentResult {
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

  let level = 1;
  for (let candidate = 2; candidate <= 8; candidate += 1) {
    const hasMetEveryGate = Array.from({ length: candidate }, (_, index) => levelAverages[index + 1] >= 2).every(Boolean);
    if (hasMetEveryGate) level = candidate;
  }

  const dimensionScores = Object.fromEntries(
    dimensions.map((dimension) => {
      const scores = scoredAnswers.filter(({ question }) => question.dimension === dimension).map(({ score }) => score);
      return [dimension, Math.round((average(scores) / 3) * 100)];
    }),
  ) as Record<AbilityDimension, number>;

  const selectedScores = scoredAnswers.map(({ score }) => score);
  const repeatedScoreCount = Math.max(...[0, 1, 2, 3].map((score) => selectedScores.filter((value) => value === score).length));
  const foundationAverage = average([levelAverages[1], levelAverages[2], levelAverages[3]]);
  const advancedAverage = average([levelAverages[5], levelAverages[6], levelAverages[7], levelAverages[8]]);
  const contradiction = foundationAverage < 1.5 && advancedAverage >= 2.5;
  const confidence = elapsedSeconds < lowConfidenceSeconds || repeatedScoreCount / questions.length > 0.75 || contradiction ? "low" : "high";

  const weakDimensions = [...dimensions].sort((left, right) => dimensionScores[left] - dimensionScores[right]).slice(0, 2);

  return {
    level,
    grade: getGrade(level),
    levelAverages,
    dimensionScores,
    weakDimensions,
    confidence,
    reviewRequired: level >= 6,
    completedAt: new Date().toISOString()
  };
}
