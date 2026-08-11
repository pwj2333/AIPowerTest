import type { AbilityDimension } from "./types";
import questionSeedData from "./questionBankData.json";

export type QuestionSeed = readonly [
  level: number,
  dimension: AbilityDimension,
  category: string,
  prompt: string,
  options: readonly [string, string, string, string],
];

export const questionSeeds = questionSeedData as unknown as QuestionSeed[];
