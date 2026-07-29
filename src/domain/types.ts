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

export interface AssessmentResult {
  level: number;
  grade: Grade;
  levelAverages: Record<number, number>;
  dimensionScores: Record<AbilityDimension, number>;
  weakDimensions: AbilityDimension[];
  confidence: Confidence;
  reviewRequired: boolean;
  completedAt: string;
}

export type AnswerMap = Record<string, string>;
