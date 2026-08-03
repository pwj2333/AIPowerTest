import { describe, expect, it } from "vitest";
import { defaultQuestionMarkdown, getOptionLengthSpread, hasOptionLengthHint, parseQuestionMarkdown, questions, serializeQuestionMarkdown } from "./questions";

describe("Markdown question bank", () => {
  it("round-trips the default bank without changing scoring keys", () => {
    const parsed = parseQuestionMarkdown(serializeQuestionMarkdown(questions));
    expect(parsed).toEqual(questions);
    expect(parseQuestionMarkdown(defaultQuestionMarkdown)).toHaveLength(20);
  });

  it("rejects an incomplete scoring key", () => {
    expect(() => parseQuestionMarkdown(defaultQuestionMarkdown.replace(/^- \[3].+$/m, ""))).toThrow("0、1、2、3 分选项");
  });

  it("keeps option wording balanced instead of exposing the score through length", () => {
    expect(questions.every((question) => getOptionLengthSpread(question) <= 8)).toBe(true);
    expect(questions.some(hasOptionLengthHint)).toBe(false);
  });

  it("keeps score keys in varied answer positions after serialization", () => {
    const scoreOrders = questions.map((question) => question.options.map((option) => option.score).join(""));
    const restoredOrders = parseQuestionMarkdown(defaultQuestionMarkdown)
      .map((question) => question.options.map((option) => option.score).join(""));

    expect(scoreOrders).not.toContain("0123");
    expect(scoreOrders).not.toContain("3210");
    expect(new Set(scoreOrders).size).toBeGreaterThanOrEqual(8);
    expect(restoredOrders).toEqual(scoreOrders);
  });

  it("rejects an imported question whose scores follow the visible order", () => {
    const orderedMarkdown = serializeQuestionMarkdown(questions.map((question) => question.id === "q1"
      ? { ...question, options: [...question.options].sort((left, right) => left.score - right.score) }
      : question));

    expect(() => parseQuestionMarkdown(orderedMarkdown)).toThrow("分值顺序过于明显");
  });

  it("rejects a score-ordered length pattern in imported questions", () => {
    const biasedMarkdown = serializeQuestionMarkdown(questions.map((question) => question.id === "q1"
      ? {
        ...question,
        options: question.options.map((option) => ({ ...option, label: `回答${"很长的文字".repeat(option.score + 1)}` }))
      }
      : question));
    expect(() => parseQuestionMarkdown(biasedMarkdown)).toThrow("避免用字数猜答案");
  });
});
