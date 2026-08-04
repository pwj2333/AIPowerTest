import { describe, expect, it } from "vitest";
import { defaultQuestionMarkdown, getOptionLengthSpread, parseQuestionMarkdown, questions, serializeQuestionMarkdown } from "./questions";

const prohibitedOptionText = /直接|不管|随便|完全不用|不用确认|无需核对|凭感觉|就行|就好|再说|吧[，。！？]?$/;

describe("Markdown question bank", () => {
  it("round-trips exactly 100 questions with the required level quotas", () => {
    const parsed = parseQuestionMarkdown(serializeQuestionMarkdown(questions));
    const levelCounts = Object.fromEntries(Array.from({ length: 8 }, (_, index) => {
      const level = index + 1;
      return [level, questions.filter((question) => question.level === level).length];
    }));

    expect(parsed).toEqual(questions);
    expect(parseQuestionMarkdown(defaultQuestionMarkdown)).toHaveLength(100);
    expect(levelCounts).toEqual({ 1: 13, 2: 13, 3: 13, 4: 13, 5: 12, 6: 12, 7: 12, 8: 12 });
  });

  it("rejects an incomplete scoring key", () => {
    expect(() => parseQuestionMarkdown(defaultQuestionMarkdown.replace(/^- \[3].+$/m, ""))).toThrow("0、1、2、3 分选项");
  });

  it("balances longest, shortest, and middle answers for every score", () => {
    const roles = Object.fromEntries([0, 1, 2, 3].map((score) => [score, { longest: 0, shortest: 0, middle: 0 }]));

    questions.forEach((question) => {
      const lengths = question.options.map((option) => Array.from(option.label).length);
      const longest = Math.max(...lengths);
      const shortest = Math.min(...lengths);
      expect(lengths.filter((length) => length === longest)).toHaveLength(1);
      expect(lengths.filter((length) => length === shortest)).toHaveLength(1);
      expect(getOptionLengthSpread(question)).toBeGreaterThanOrEqual(2);
      expect(getOptionLengthSpread(question)).toBeLessThanOrEqual(8);
      question.options.forEach((option, index) => {
        expect(lengths[index]).toBeGreaterThanOrEqual(12);
        expect(lengths[index]).toBeLessThanOrEqual(30);
        const role = lengths[index] === longest ? "longest" : lengths[index] === shortest ? "shortest" : "middle";
        roles[option.score][role] += 1;
      });
    });

    expect(roles).toEqual(Object.fromEntries([0, 1, 2, 3].map((score) => [score, { longest: 25, shortest: 25, middle: 50 }])));
  });

  it("uses plausible wording without score-revealing shortcuts or filler", () => {
    const optionLabels = questions.flatMap((question) => question.options.map((option) => option.label));

    expect(optionLabels.some((label) => prohibitedOptionText.test(label))).toBe(false);
    expect(new Set(optionLabels).size).toBe(optionLabels.length);
    expect(questions.every((question) => question.prompt.endsWith("？"))).toBe(true);
    expect(new Set(questions.map((question) => question.prompt)).size).toBe(questions.length);
  });

  it("covers the requested general workplace AI topics", () => {
    const visibleText = questions.flatMap((question) => [question.category, question.prompt, ...question.options.map((option) => option.label)]).join(" ");

    expect(visibleText).toMatch(/聚合平台/);
    expect(visibleText).toMatch(/模型选择/);
    expect(visibleText).toMatch(/知识库/);
    expect(visibleText).toMatch(/工作流/);
    expect(visibleText).toMatch(/智能体/);
    expect(visibleText).toMatch(/权限/);
  });

  it("rejects an imported answer outside the natural length range", () => {
    const invalidMarkdown = serializeQuestionMarkdown(questions.map((question) => question.id === "q001"
      ? { ...question, options: question.options.map((option, index) => index === 0 ? { ...option, label: "答案太短" } : option) }
      : question));

    expect(() => parseQuestionMarkdown(invalidMarkdown)).toThrow("12–30 个字符");
  });

  it("rejects duplicate prompts and prohibited option wording", () => {
    const duplicatePrompt = serializeQuestionMarkdown(questions.map((question, index) => index === 1 ? { ...question, prompt: questions[0].prompt } : question));
    const prohibitedWording = serializeQuestionMarkdown(questions.map((question, index) => index === 0
      ? { ...question, options: question.options.map((option, optionIndex) => optionIndex === 0 ? { ...option, label: "直接采用生成内容再交给负责人复核" } : option) }
      : question));

    expect(() => parseQuestionMarkdown(duplicatePrompt)).toThrow("题干不能重复");
    expect(() => parseQuestionMarkdown(prohibitedWording)).toThrow("包含容易提示分值的表达");
  });
});
