import { beforeEach, describe, expect, it } from "vitest";
import { defaultQuestionMarkdown } from "./questions";
import { createAssessmentRepository } from "./store";

const answers = Object.fromEntries(
  Array.from({ length: 20 }, (_, index) => {
    const questionId = `q${index + 1}`;
    return [questionId, `${questionId}-option-2`];
  }),
);

describe("assessment repository", () => {
  beforeEach(() => localStorage.clear());

  it("starts with no test campaigns or participants", () => {
    const repository = createAssessmentRepository("empty-production-test");
    expect(repository.listCampaigns()).toEqual([]);
  });

  it("migrates the previous default question bank to the refreshed version", () => {
    localStorage.setItem("question-bank-migration-test", JSON.stringify({
      campaigns: [{ id: "campaign-1", status: "open", questionVersion: "v1.0" }],
      participants: [],
      drafts: {},
      results: [],
      questionBank: { version: "v1.0", markdown: defaultQuestionMarkdown, updatedAt: "2026-01-01T00:00:00.000Z" }
    }));
    const repository = createAssessmentRepository("question-bank-migration-test");

    expect(repository.getQuestionBank().version).toBe("v2.1");
    expect(repository.getQuestionBank().questions[0].prompt).toContain("会议通知");
    expect(repository.listCampaigns()[0].questionVersion).toBe("v2.1");
    expect(repository.saveQuestionBank(defaultQuestionMarkdown).version).toBe("v2.2");
  });

  it("imports valid roster rows and reports duplicates without storing them", () => {
    const repository = createAssessmentRepository("import-test");
    const campaign = repository.createCampaign({ name: "2026 年 AI 能力测评" });

    const report = repository.importParticipants(campaign.id, [
      { name: "李明", department: "运营部", position: "主管" },
      { name: "李明", department: "运营部", position: "主管" },
      { name: "张倩", department: "市场部", position: "专员" }
    ]);

    expect(report.imported).toHaveLength(2);
    expect(report.errors).toEqual([{ row: 2, message: "同一批次中姓名和部门重复" }]);
    expect(repository.listParticipants(campaign.id)).toHaveLength(2);
  });

  it("persists a draft and permits only one submitted result per participant", () => {
    const repository = createAssessmentRepository("submission-test");
    const campaign = repository.createCampaign({ name: "2026 年 AI 能力测评" });
    const [participant] = repository.importParticipants(campaign.id, [
      { name: "王磊", department: "技术部", position: "工程师" }
    ]).imported;

    repository.saveDraft(participant.id, { q1: "q1-option-2" });
    expect(repository.getDraft(participant.id)).toEqual({ q1: "q1-option-2" });

    const result = repository.submitAssessment(participant.id, answers, 600);
    expect(result.level).toBe(5);
    expect(repository.getResult(participant.id)?.level).toBe(5);
    expect(() => repository.submitAssessment(participant.id, answers, 600)).toThrow("该员工已完成本批次测评");
  });

  it("finds one person by name and rejects missing or ambiguous names", () => {
    const repository = createAssessmentRepository("identity-test");
    const campaign = repository.createCampaign({ name: "身份测试" });
    const [participant] = repository.importParticipants(campaign.id, [
      { name: "王小明", department: "技术部", position: "工程师" },
      { name: "李明", department: "技术部", position: "工程师" },
      { name: "李明", department: "运营部", position: "主管" }
    ]).imported;

    expect(repository.findParticipantByName("其他人")).toBeUndefined();
    expect(repository.findParticipantByName("李明")).toBeUndefined();
    expect(repository.getParticipant(participant.id)?.visitedAt).toBeUndefined();
    expect(repository.findParticipantByName("  王小明  ")?.id).toBe(participant.id);
    expect(repository.getParticipant(participant.id)?.visitedAt).toBeTruthy();
  });
});
