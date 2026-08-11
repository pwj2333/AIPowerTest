import { describe, expect, it } from "vitest";
import { defaultQuestionMarkdown, getGrade, parseQuestionMarkdown, questions, serializeQuestionMarkdown } from "./questions";

const prohibitedOptionText = /不管|随便|完全不用|不用确认|无需核对|凭感觉|就行|就好|再说|吧[，。！？]?$/;

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

  it("keeps the approved revision wording without generated length fillers", () => {
    expect(questions.find((question) => question.id === "q013")).toMatchObject({
      category: "检查 AI 答案",
      prompt: "AI 给出的答案看起来不错，你下一步会怎样？",
      options: [
        { score: 0, label: "看到答案完整，就直接拿去用" },
        { score: 1, label: "先读一遍，找出明显不对的地方" },
        { score: 2, label: "拿关键内容和原始资料做比较" },
        { score: 3, label: "确认事实、日期和数字无误后，再交付使用" },
      ],
    });
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
    const beginnerText = questions
      .filter((question) => question.level <= 4)
      .flatMap((question) => [question.category, question.prompt, ...question.options.map((option) => option.label)])
      .join(" ");

    expect(visibleText).toMatch(/多个 AI/);
    expect(visibleText).toMatch(/AI 工具/);
    expect(visibleText).toMatch(/公司资料库/);
    expect(visibleText).toMatch(/AI 助手/);
    expect(visibleText).toMatch(/权限/);
    expect(beginnerText).toMatch(/WorkBuddy/);
    expect(beginnerText).toMatch(/付费/);
    expect(beginnerText).toMatch(/国外大模型/);
    expect(beginnerText).toMatch(/国内大模型/);
    expect(beginnerText).toMatch(/AI 可以帮忙解决/);
    expect(beginnerText).not.toMatch(/聚合平台|模型路由|检索增强|多模态|API|知识库|工作流|智能体|治理|审计/);
  });

  it("provides three sufficiently detailed action tasks for every level", () => {
    const taskSets = Array.from({ length: 9 }, (_, level) => getGrade(level).tasks);
    expect(taskSets).toHaveLength(9);
    expect(taskSets.every((tasks) => tasks.length === 3 && tasks.every((task) => Array.from(task).length >= 28))).toBe(true);
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
      ? { ...question, options: question.options.map((option, optionIndex) => optionIndex === 0 ? { ...option, label: "无需核对事实，直接用生成内容交付" } : option) }
      : question));

    expect(() => parseQuestionMarkdown(duplicatePrompt)).toThrow("题干不能重复");
    expect(() => parseQuestionMarkdown(prohibitedWording)).toThrow("包含容易提示分值的表达");
  });
});
