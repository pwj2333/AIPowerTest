export type AbilityDimension =
  | "office"
  | "scenario"
  | "workflow"
  | "innovation";

export type Confidence = "high" | "low";

export interface QuestionOption {
  id: string;
  label: string;
  score: 0 | 1 | 2 | 3;
}

export interface AssessmentQuestion {
  id: string;
  level: number;
  dimension: AbilityDimension;
  category: string;
  prompt: string;
  options: QuestionOption[];
}

export interface Grade {
  level: number;
  code: string;
  name: string;
  capability: string;
  color: string;
  tasks: string[];
}

export interface StageResult {
  level: number;
  questionIds: string[];
  questionCount: number;
  totalScore: number;
  status: "passed" | "failed";
}

export interface AssessmentResult {
  level: number;
  grade: Grade;
  totalScore: number;
  maxScore: number;
  scorePercent: number;
  levelAverages: Partial<Record<number, number>>;
  dimensionScores: Record<AbilityDimension, number | null>;
  weakDimensions: AbilityDimension[];
  answeredQuestionCount?: number;
  stoppedAtLevel?: number;
  stageResults?: StageResult[];
  confidence: Confidence;
  reviewRequired: boolean;
  completedAt: string;
}

export type AnswerMap = Record<string, string>;
