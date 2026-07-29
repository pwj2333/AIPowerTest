import { describe, expect, it } from "vitest";
import { defaultQuestionMarkdown, parseQuestionMarkdown, questions, serializeQuestionMarkdown } from "./questions";

describe("Markdown question bank", () => {
  it("round-trips the default bank without changing scoring keys", () => {
    const parsed = parseQuestionMarkdown(serializeQuestionMarkdown(questions));
    expect(parsed).toEqual(questions);
    expect(parseQuestionMarkdown(defaultQuestionMarkdown)).toHaveLength(20);
  });

  it("rejects an incomplete scoring key", () => {
    expect(() => parseQuestionMarkdown(defaultQuestionMarkdown.replace(/^- \[3].+$/m, ""))).toThrow("0、1、2、3 分选项");
  });
});
