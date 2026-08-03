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

  it("uses exactly 18 characters for every answer and asks direct questions", () => {
    const lengths = questions.flatMap((question) => question.options.map((option) => Array.from(option.label).length));

    expect(new Set(lengths)).toEqual(new Set([18]));
    expect(questions.every((question) => question.prompt.endsWith("？"))).toBe(true);
  });

  it("uses everyday wording instead of management or technical jargon", () => {
    const visibleText = questions.flatMap((question) => [question.prompt, ...question.options.map((option) => option.label)]).join("");
    expect(visibleText).not.toMatch(/验收|搭入口|落地|迭代|端到端|基线|采用率|沉淀|资产|组织能力|平台治理|长效机制|复用|回归验证/);
  });

  it("rejects an imported answer whose length is not exactly 18 characters", () => {
    const invalidMarkdown = serializeQuestionMarkdown(questions.map((question) => question.id === "q1"
      ? { ...question, options: question.options.map((option, index) => index === 0 ? { ...option, label: "答案太短" } : option) }
      : question));

    expect(() => parseQuestionMarkdown(invalidMarkdown)).toThrow("答案必须统一为 18 个字符");
  });

  it("keeps score keys in varied answer positions after serialization", () => {
    const scoreOrders = questions.map((question) => question.options.map((option) => option.score).join(""));
    const restoredOrders = parseQuestionMarkdown(defaultQuestionMarkdown)
      .map((question) => question.options.map((option) => option.score).join(""));

    expect(scoreOrders).not.toContain("0123");
    expect(scoreOrders).not.toContain("3210");
    expect(new Set(scoreOrders).size).toBeGreaterThanOrEqual(8);
    expect(restoredOrders).toEqual(scoreOrders);
    expect(questions.every((question) => question.options.at(-1)?.score !== 3)).toBe(true);
  });

  it("rejects an imported question whose scores follow the visible order", () => {
    const orderedMarkdown = serializeQuestionMarkdown(questions.map((question) => question.id === "q1"
      ? { ...question, options: [...question.options].sort((left, right) => left.score - right.score) }
      : question));

    expect(() => parseQuestionMarkdown(orderedMarkdown)).toThrow("分值顺序过于明显");
  });

  it("rejects an imported question whose highest score is last", () => {
    const highestLastMarkdown = serializeQuestionMarkdown(questions.map((question) => question.id === "q1"
      ? { ...question, options: [...question.options].sort((left, right) => left.score === 3 ? 1 : right.score === 3 ? -1 : 0) }
      : question));

    expect(() => parseQuestionMarkdown(highestLastMarkdown)).toThrow("最高分选项不能放在最后");
  });

  it("rejects a score-ordered length pattern in imported questions", () => {
    const biasedMarkdown = serializeQuestionMarkdown(questions.map((question) => question.id === "q1"
      ? {
        ...question,
        options: question.options.map((option) => ({ ...option, label: `回答${"很长的文字".repeat(option.score + 1)}` }))
      }
      : question));
    expect(() => parseQuestionMarkdown(biasedMarkdown)).toThrow("答案必须统一为 18 个字符");
  });
});
