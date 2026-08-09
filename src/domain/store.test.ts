import { beforeEach, describe, expect, it } from "vitest";
import { defaultQuestionMarkdown } from "./questions";
import { selectStageQuestions } from "./scoring";
import { createAssessmentRepository } from "./store";
import type { AssessmentDraft } from "./store";

function stageAnswers(repository: ReturnType<typeof createAssessmentRepository>, participantId: string, level: number, score: number) {
  const bank = repository.getQuestionBank();
  const questions = selectStageQuestions(bank.questions, level, `${participantId}:${bank.version}`);
  return Object.fromEntries(questions.map((question) => [question.id, `${question.id}-option-${score}`]));
}

describe("assessment repository", () => {
  beforeEach(() => localStorage.clear());

  it("starts with no test campaigns or participants", () => {
    const repository = createAssessmentRepository("empty-production-test");
    expect(repository.listCampaigns()).toEqual([]);
  });

  it("reuses a global roster for new campaigns without deleting it", () => {
    const repository = createAssessmentRepository("global-roster-test");
    const roster = repository.importRoster([
      { name: "Alice", department: "Sales", position: "Lead" },
      { name: "Bob", department: "Operations", position: "Specialist" },
    ]);
    const first = repository.createCampaign({ name: "First" });
    const second = repository.createCampaign({ name: "Second" });

    expect(repository.listRoster().map((person) => person.name)).toEqual(["Alice", "Bob"]);
    expect(repository.listParticipants(first.id).map((person) => person.name)).toEqual(["Alice", "Bob"]);
    expect(repository.listParticipants(second.id).map((person) => person.name)).toEqual(["Alice", "Bob"]);
    expect(repository.listParticipants(first.id)[0].token).not.toBe(repository.listParticipants(second.id)[0].token);

    repository.setRosterEnrollment(second.id, roster.imported[0].id, false);
    expect(repository.listParticipants(second.id).map((person) => person.name)).toEqual(["Bob"]);
    repository.setRosterEnrollment(second.id, roster.imported[0].id, true);
    expect(repository.listParticipants(second.id).map((person) => person.name)).toEqual(["Alice", "Bob"]);

    repository.deleteCampaign(first.id);
    expect(repository.listRoster().map((person) => person.name)).toEqual(["Alice", "Bob"]);
  });

  it("skips malformed legacy participants while building the global roster", () => {
    localStorage.setItem("malformed-roster-migration-test", JSON.stringify({
      campaigns: [{ id: "c1", name: "First", status: "open", questionVersion: "v3.0", createdAt: "2026-08-09T00:00:00.000Z" }],
      participants: [null, { id: "p1", campaignId: "c1", name: "Alice", department: "Sales", position: "Lead", token: "invite-1" }],
      drafts: {},
      results: []
    }));
    const repository = createAssessmentRepository("malformed-roster-migration-test");

    expect(repository.listRoster().map((person) => person.name)).toEqual(["Alice"]);
    expect(repository.listParticipants("c1").map((person) => person.id)).toEqual(["p1"]);
  });

  it("keeps tokenless public participants available for name entry", () => {
    localStorage.setItem("public-participant-state-test", JSON.stringify({
      campaigns: [{ id: "c1", name: "First", status: "open", questionVersion: "v3.0", createdAt: "2026-08-09T00:00:00.000Z" }],
      participants: [{ id: "p1", campaignId: "c1", name: "Alice", department: "Sales", position: "Lead" }],
      drafts: {},
      results: []
    }));
    const repository = createAssessmentRepository("public-participant-state-test");

    expect(repository.findParticipantByName("Alice")?.id).toBe("p1");
  });

  it("uses the most recent open campaign for a reused roster member", () => {
    const repository = createAssessmentRepository("multiple-open-campaigns-test");
    repository.importRoster([{ name: "Alice", department: "Sales", position: "Lead" }]);
    repository.createCampaign({ name: "First" });
    const latest = repository.createCampaign({ name: "Latest" });

    expect(repository.findParticipantByName("Alice")?.campaignId).toBe(latest.id);
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

    expect(repository.getQuestionBank().version).toBe("v3.0");
    expect(repository.getQuestionBank().questions).toHaveLength(100);
    expect(repository.listCampaigns()[0].questionVersion).toBe("v3.0");
    expect(repository.saveQuestionBank(defaultQuestionMarkdown).version).toBe("v3.1");
  });

  it("keeps a custom legacy question bank version for administrator review", () => {
    localStorage.setItem("custom-question-bank-test", JSON.stringify({
      campaigns: [],
      participants: [],
      drafts: {},
      results: [],
      questionBank: { version: "v2.2", markdown: defaultQuestionMarkdown, updatedAt: "2026-01-01T00:00:00.000Z" }
    }));
    const repository = createAssessmentRepository("custom-question-bank-test");

    expect(repository.getQuestionBank().version).toBe("v2.2");
    expect(repository.getQuestionBank().markdown).toBe(defaultQuestionMarkdown);
  });

  it("migrates an old twenty-question bank before the admin page reads it", () => {
    const legacyMarkdown = ["# Legacy question bank", ...Array.from({ length: 20 }, (_, index) => `## q${index + 1}`)].join("\n");
    localStorage.setItem("legacy-question-bank-test", JSON.stringify({
      campaigns: [{ id: "campaign-legacy", status: "open", questionVersion: "v2.2" }],
      participants: [],
      drafts: {},
      results: [],
      questionBank: { version: "v2.2", markdown: legacyMarkdown, updatedAt: "2026-01-01T00:00:00.000Z" }
    }));
    const repository = createAssessmentRepository("legacy-question-bank-test");

    expect(() => repository.getQuestionBank()).not.toThrow();
    expect(repository.getQuestionBank().version).toBe("v3.0");
    expect(repository.getQuestionBank().questions).toHaveLength(100);
    expect(repository.listCampaigns()[0].questionVersion).toBe("v3.0");
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

    const draft: AssessmentDraft = {
      questionVersion: repository.getQuestionBank().version,
      activeLevel: 1,
      startedAt: "2026-08-04T00:00:00.000Z",
      answers: stageAnswers(repository, participant.id, 1, 2),
    };
    repository.saveDraft(participant.id, draft);
    expect(repository.getDraft(participant.id)).toEqual(draft);

    const result = repository.submitAssessment(participant.id, {
      ...draft.answers,
      ...stageAnswers(repository, participant.id, 2, 1),
    }, 600);
    expect(result.level).toBe(1);
    expect(repository.getResult(participant.id)?.level).toBe(1);
    expect(() => repository.submitAssessment(participant.id, draft.answers, 600)).toThrow("该员工已完成本批次测评");
  });

  it("marks a legacy answer map as requiring a fresh adaptive draft", () => {
    const repository = createAssessmentRepository("legacy-draft-test");
    const campaign = repository.createCampaign({ name: "legacy" });
    const [participant] = repository.importParticipants(campaign.id, [{ name: "Alice", department: "Sales", position: "Lead" }]).imported;
    const stored = JSON.parse(localStorage.getItem("legacy-draft-test") ?? "{}");
    stored.questionBank = { version: "v2.1", markdown: "legacy", updatedAt: "2026-01-01T00:00:00.000Z" };
    stored.drafts = { [participant.id]: { q001: "q001-option-2" } };
    localStorage.setItem("legacy-draft-test", JSON.stringify(stored));

    expect(repository.getDraft(participant.id)).toMatchObject({ resetRequired: true, answers: { q001: "q001-option-2" } });
  });

  it("rejects answers for questions outside the participant's adaptive path", () => {
    const repository = createAssessmentRepository("adaptive-path-validation-test");
    const campaign = repository.createCampaign({ name: "path validation" });
    const [participant] = repository.importParticipants(campaign.id, [{ name: "Alice", department: "Sales", position: "Lead" }]).imported;
    const bank = repository.getQuestionBank();
    const stage = selectStageQuestions(bank.questions, 1, `${participant.id}:${bank.version}`);
    const answers = Object.fromEntries(stage.map((question) => [question.id, `${question.id}-option-0`]));
    const extraQuestion = bank.questions.find((question) => !stage.some((selected) => selected.id === question.id))!;
    answers[extraQuestion.id] = extraQuestion.options[0].id;

    expect(() => repository.submitAssessment(participant.id, answers, 120)).toThrow("答案包含未抽取或已锁定的题目");
  });

  it("does not accept the legacy participant-only random path", () => {
    const repository = createAssessmentRepository("legacy-seed-rejection-test");
    const campaign = repository.createCampaign({ name: "path validation" });
    const [participant] = repository.importParticipants(campaign.id, [{ name: "Alice", department: "Sales", position: "Lead" }]).imported;
    const bank = repository.getQuestionBank();
    const legacyStage = selectStageQuestions(bank.questions, 1, participant.id);
    const answers = Object.fromEntries(legacyStage.map((question) => [question.id, `${question.id}-option-0`]));

    expect(() => repository.submitAssessment(participant.id, answers, 120)).toThrow();
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
    expect(repository.getParticipant(participant.id)?.visitedAt).toBeUndefined();
    repository.verifyParticipantName(participant.token, "  王小明  ");
    expect(repository.getParticipant(participant.id)?.visitedAt).toBeTruthy();
  });

  it("copies people to another campaign and skips existing identities", () => {
    const repository = createAssessmentRepository("copy-test");
    const source = repository.createCampaign({ name: "source" });
    const target = repository.createCampaign({ name: "target" });
    repository.importParticipants(source.id, [
      { name: "Alice", department: "Sales", position: "Lead" },
      { name: "Bob", department: "Sales", position: "Rep" },
    ]);
    repository.importParticipants(target.id, [{ name: "Alice", department: "Sales", position: "Old" }]);

    const report = repository.copyParticipants(source.id, target.id);

    expect(report.imported.map((person) => person.name)).toEqual(["Bob"]);
    expect(report.skipped).toEqual([{ name: "Alice", department: "Sales" }]);
  });

  it("archives, recovers, and permanently deletes a campaign with its data", () => {
    const repository = createAssessmentRepository("delete-test");
    const campaign = repository.createCampaign({ name: "to delete" });
    const [person] = repository.importParticipants(campaign.id, [
      { name: "Alice", department: "Sales", position: "Lead" },
    ]).imported;

    repository.saveDraft(person.id, { q001: "q001-option-1" });
    expect(repository.setCampaignStatus(campaign.id, "archived").status).toBe("archived");
    expect(repository.setCampaignStatus(campaign.id, "open").status).toBe("open");

    repository.deleteCampaign(campaign.id);

    expect(repository.getCampaign(campaign.id)).toBeUndefined();
    expect(repository.getParticipant(person.id)).toBeUndefined();
    expect(repository.getDraft(person.id)).toBeUndefined();
  });
});
