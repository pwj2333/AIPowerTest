import { questions } from "./questions";
import { scoreAssessment } from "./scoring";
import type { AnswerMap, AssessmentResult } from "./types";

export type CampaignStatus = "draft" | "open" | "closed" | "archived";

export interface AssessmentCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  questionVersion: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  campaignId: string;
  name: string;
  department: string;
  position: string;
  token: string;
  visitedAt?: string;
  completedAt?: string;
}

export interface RosterRow {
  name: string;
  department: string;
  position: string;
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportReport {
  imported: Participant[];
  errors: ImportError[];
}

export interface StoredResult {
  participantId: string;
  campaignId: string;
  answers: AnswerMap;
  elapsedSeconds: number;
  result: AssessmentResult;
}

interface AssessmentState {
  campaigns: AssessmentCampaign[];
  participants: Participant[];
  drafts: Record<string, AnswerMap>;
  results: StoredResult[];
}

const defaultStorageKey = "ai-capability-assessment-v1";
const memoryStorage = new Map<string, string>();

function makeId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function emptyState(): AssessmentState {
  return { campaigns: [], participants: [], drafts: {}, results: [] };
}

function answerSet(levelScores: number[]): AnswerMap {
  return Object.fromEntries(
    questions.map((question) => [question.id, `${question.id}-option-${levelScores[question.level - 1] ?? 0}`]),
  );
}

export interface AssessmentRepository {
  createCampaign(input: Pick<AssessmentCampaign, "name">): AssessmentCampaign;
  listCampaigns(): AssessmentCampaign[];
  getCampaign(campaignId: string): AssessmentCampaign | undefined;
  setCampaignStatus(campaignId: string, status: CampaignStatus): AssessmentCampaign;
  importParticipants(campaignId: string, rows: RosterRow[]): ImportReport;
  listParticipants(campaignId: string): Participant[];
  getParticipant(participantId: string): Participant | undefined;
  getParticipantByToken(token: string): Participant | undefined;
  saveDraft(participantId: string, answers: AnswerMap): void;
  getDraft(participantId: string): AnswerMap;
  submitAssessment(participantId: string, answers: AnswerMap, elapsedSeconds: number): AssessmentResult;
  getResult(participantId: string): AssessmentResult | undefined;
  listResults(campaignId: string): StoredResult[];
  seedDemoData(): AssessmentCampaign;
  reset(): void;
}

export function createAssessmentRepository(storageKey = defaultStorageKey): AssessmentRepository {
  const read = (): AssessmentState => {
    const raw = typeof localStorage === "undefined" ? memoryStorage.get(storageKey) : localStorage.getItem(storageKey);
    if (!raw) return emptyState();
    try {
      return JSON.parse(raw) as AssessmentState;
    } catch {
      return emptyState();
    }
  };

  const write = (state: AssessmentState) => {
    const serialized = JSON.stringify(state);
    if (typeof localStorage === "undefined") memoryStorage.set(storageKey, serialized);
    else localStorage.setItem(storageKey, serialized);
  };

  const requireCampaign = (state: AssessmentState, campaignId: string) => {
    const campaign = state.campaigns.find((item) => item.id === campaignId);
    if (!campaign) throw new Error("未找到测评批次");
    return campaign;
  };

  const requireParticipant = (state: AssessmentState, participantId: string) => {
    const participant = state.participants.find((item) => item.id === participantId);
    if (!participant) throw new Error("未找到员工测评链接");
    return participant;
  };

  const repository: AssessmentRepository = {
    createCampaign(input) {
      const state = read();
      const campaign: AssessmentCampaign = {
        id: makeId("campaign"),
        name: input.name.trim() || "未命名测评批次",
        status: "open",
        questionVersion: "v1.0",
        createdAt: new Date().toISOString()
      };
      state.campaigns.unshift(campaign);
      write(state);
      return campaign;
    },

    listCampaigns() {
      return read().campaigns;
    },

    getCampaign(campaignId) {
      return read().campaigns.find((item) => item.id === campaignId);
    },

    setCampaignStatus(campaignId, status) {
      const state = read();
      const campaign = requireCampaign(state, campaignId);
      campaign.status = status;
      write(state);
      return campaign;
    },

    importParticipants(campaignId, rows) {
      const state = read();
      requireCampaign(state, campaignId);
      const imported: Participant[] = [];
      const errors: ImportError[] = [];
      const identities = new Set(state.participants.filter((person) => person.campaignId === campaignId).map((person) => `${person.name}|${person.department}`));

      rows.forEach((rawRow, index) => {
        const row = {
          name: rawRow.name?.trim(),
          department: rawRow.department?.trim(),
          position: rawRow.position?.trim()
        };
        if (!row.name || !row.department || !row.position) {
          errors.push({ row: index + 1, message: "姓名、部门和岗位均为必填项" });
          return;
        }
        const identity = `${row.name}|${row.department}`;
        if (identities.has(identity)) {
          errors.push({ row: index + 1, message: "同一批次中姓名和部门重复" });
          return;
        }
        identities.add(identity);
        const participant: Participant = {
          id: makeId("participant"),
          campaignId,
          name: row.name,
          department: row.department,
          position: row.position,
          token: makeId("invite")
        };
        state.participants.push(participant);
        imported.push(participant);
      });
      write(state);
      return { imported, errors };
    },

    listParticipants(campaignId) {
      return read().participants.filter((person) => person.campaignId === campaignId);
    },

    getParticipant(participantId) {
      return read().participants.find((person) => person.id === participantId);
    },

    getParticipantByToken(token) {
      const state = read();
      const participant = state.participants.find((person) => person.token === token);
      if (participant && !participant.visitedAt) {
        participant.visitedAt = new Date().toISOString();
        write(state);
      }
      return participant;
    },

    saveDraft(participantId, answers) {
      const state = read();
      const participant = requireParticipant(state, participantId);
      if (state.results.some((item) => item.participantId === participant.id)) return;
      state.drafts[participantId] = answers;
      write(state);
    },

    getDraft(participantId) {
      return read().drafts[participantId] ?? {};
    },

    submitAssessment(participantId, answers, elapsedSeconds) {
      const state = read();
      const participant = requireParticipant(state, participantId);
      const campaign = requireCampaign(state, participant.campaignId);
      if (campaign.status !== "open") throw new Error("当前测评批次未开放");
      if (state.results.some((item) => item.participantId === participantId)) throw new Error("该员工已完成本批次测评");
      if (Object.keys(answers).length !== questions.length) throw new Error("请完成全部 20 道题后再提交");

      const result = scoreAssessment(answers, elapsedSeconds);
      state.results.push({ participantId, campaignId: participant.campaignId, answers, elapsedSeconds, result });
      participant.completedAt = result.completedAt;
      delete state.drafts[participantId];
      write(state);
      return result;
    },

    getResult(participantId) {
      return read().results.find((item) => item.participantId === participantId)?.result;
    },

    listResults(campaignId) {
      return read().results.filter((item) => item.campaignId === campaignId);
    },

    seedDemoData() {
      const existingCampaign = read().campaigns[0];
      if (existingCampaign) return existingCampaign;

      const campaign = repository.createCampaign({ name: "2026 年度 AI 能力测评" });
      const report = repository.importParticipants(campaign.id, [
        { name: "李明", department: "运营部", position: "主管" },
        { name: "张倩", department: "市场部", position: "专员" },
        { name: "王磊", department: "技术部", position: "工程师" },
        { name: "陈婷", department: "职能部", position: "人事专员" },
        { name: "赵敏", department: "运营部", position: "项目经理" },
        { name: "周凯", department: "市场部", position: "策划经理" },
        { name: "刘洋", department: "技术部", position: "产品经理" },
        { name: "宋佳", department: "职能部", position: "行政专员" },
        { name: "示例员工", department: "运营部", position: "业务专员" }
      ]);
      const scoreProfiles = [
        [3, 3, 3, 3, 1, 0, 0, 0],
        [2, 2, 2, 1, 0, 0, 0, 0],
        [3, 3, 3, 3, 3, 3, 1, 0],
        [2, 1, 0, 0, 0, 0, 0, 0],
        [3, 3, 3, 2, 2, 0, 0, 0],
        [3, 3, 2, 0, 0, 0, 0, 0],
        [3, 3, 3, 3, 3, 2, 2, 0],
        [1, 1, 0, 0, 0, 0, 0, 0]
      ];
      report.imported.slice(0, scoreProfiles.length).forEach((participant, index) => {
        repository.submitAssessment(participant.id, answerSet(scoreProfiles[index]), 420 + index * 10);
      });
      return campaign;
    },

    reset() {
      write(emptyState());
    }
  };

  return repository;
}

export const assessmentRepository = createAssessmentRepository();
