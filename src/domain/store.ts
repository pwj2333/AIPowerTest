import { defaultQuestionMarkdown, parseQuestionMarkdown } from "./questions";
import { scoreAdaptiveAssessment } from "./scoring";
import type { AnswerMap, AssessmentQuestion, AssessmentResult } from "./types";

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
  questionVersion?: string;
  answers: AnswerMap;
  elapsedSeconds: number;
  result: AssessmentResult;
}

export interface AssessmentDraft {
  questionVersion: string;
  activeLevel: number;
  startedAt: string;
  answers: AnswerMap;
  resetRequired?: boolean;
}

interface StoredQuestionBank {
  version: string;
  markdown: string;
  updatedAt: string;
}

export interface QuestionBank extends StoredQuestionBank {
  questions: AssessmentQuestion[];
}

interface AssessmentState {
  campaigns: AssessmentCampaign[];
  participants: Participant[];
  drafts: Record<string, AssessmentDraft>;
  results: StoredResult[];
  questionBank: StoredQuestionBank;
}

interface AssessmentStatePatch {
  campaigns?: Array<Partial<AssessmentCampaign> & Pick<AssessmentCampaign, "id">>;
  participants?: Array<Partial<Participant> & Pick<Participant, "id">>;
  drafts?: Record<string, AssessmentDraft | null>;
  results?: StoredResult[];
  questionBank?: StoredQuestionBank;
  remove?: {
    campaigns?: string[];
    participants?: string[];
    drafts?: string[];
    results?: string[];
  };
}

const defaultStorageKey = "ai-capability-assessment-v2";
const currentQuestionBankVersion = "v3.0";
const memoryStorage = new Map<string, string>();

function makeId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function initialQuestionBank(): StoredQuestionBank {
  return { version: currentQuestionBankVersion, markdown: defaultQuestionMarkdown, updatedAt: new Date().toISOString() };
}

function emptyState(): AssessmentState {
  return { campaigns: [], participants: [], drafts: {}, results: [], questionBank: initialQuestionBank() };
}

function normalizeState(stored: Partial<AssessmentState>): AssessmentState {
  const storedQuestionBank = stored.questionBank ?? initialQuestionBank();
  const storedVersion = typeof storedQuestionBank.version === "string" ? storedQuestionBank.version : currentQuestionBankVersion;
  const rawDrafts = stored.drafts && typeof stored.drafts === "object" ? stored.drafts as Record<string, unknown> : {};
  const drafts = Object.fromEntries(Object.entries(rawDrafts).flatMap(([participantId, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const candidate = value as Partial<AssessmentDraft>;
    if (candidate.answers && typeof candidate.answers === "object" && !Array.isArray(candidate.answers)) {
      return [[participantId, {
        questionVersion: typeof candidate.questionVersion === "string" ? candidate.questionVersion : storedVersion,
        activeLevel: Number.isInteger(candidate.activeLevel) ? Number(candidate.activeLevel) : 1,
        startedAt: typeof candidate.startedAt === "string" ? candidate.startedAt : new Date().toISOString(),
        answers: candidate.answers,
        ...(candidate.resetRequired ? { resetRequired: true } : {})
      } satisfies AssessmentDraft]];
    }
    return [[participantId, {
      questionVersion: storedVersion,
      activeLevel: 1,
      startedAt: new Date().toISOString(),
      answers: value as AnswerMap,
      resetRequired: true
    } satisfies AssessmentDraft]];
  })) as Record<string, AssessmentDraft>;
  const state: AssessmentState = {
    campaigns: Array.isArray(stored.campaigns) ? stored.campaigns : [],
    participants: Array.isArray(stored.participants) ? stored.participants : [],
    drafts,
    results: Array.isArray(stored.results) ? stored.results : [],
    questionBank: storedQuestionBank
  };
  const useDefaultQuestionBank = () => {
    state.questionBank = initialQuestionBank();
    state.campaigns = state.campaigns.map((campaign) => campaign.status === "open"
      ? { ...campaign, questionVersion: state.questionBank.version }
      : campaign);
  };
  const isKnownDefaultVersion = state.questionBank.version === "v1.0" || state.questionBank.version === "v2.1";
  let validCurrentBank = false;
  try {
    validCurrentBank = parseQuestionMarkdown(state.questionBank.markdown).length === 100;
  } catch {
    validCurrentBank = false;
  }
  if (isKnownDefaultVersion || !validCurrentBank) useDefaultQuestionBank();
  Object.values(state.drafts).forEach((draft) => {
    if (draft.questionVersion !== state.questionBank.version) draft.resetRequired = true;
  });
  return state;
}

function cloneState(state: AssessmentState): AssessmentState {
  return JSON.parse(JSON.stringify(state)) as AssessmentState;
}

function createStatePatch(previous: AssessmentState, next: AssessmentState): AssessmentStatePatch {
  const changed = <T extends { id: string }>(before: T[], after: T[]): Array<Partial<T> & Pick<T, "id">> => {
    const updates: Array<Partial<T> & Pick<T, "id">> = [];
    after.forEach((item) => {
      const existing = before.find((candidate) => candidate.id === item.id);
      if (!existing) {
        updates.push(item);
        return;
      }
      const fields = Object.fromEntries(Object.entries(item).filter(([key, value]) => key === "id" || JSON.stringify(existing[key as keyof T]) !== JSON.stringify(value)));
      if (Object.keys(fields).length > 1) updates.push(fields as Partial<T> & Pick<T, "id">);
    });
    return updates;
  };
  // ponytail: these lists are expected to stay below a few thousand rows; use indexed maps if that ceiling changes.
  const campaigns = changed(previous.campaigns, next.campaigns);
  const participants = changed(previous.participants, next.participants);
  const results = next.results.filter((item) => {
    const existing = previous.results.find((candidate) => candidate.participantId === item.participantId);
    return !existing || JSON.stringify(existing) !== JSON.stringify(item);
  });
  const drafts = Object.fromEntries([...new Set([...Object.keys(previous.drafts), ...Object.keys(next.drafts)])]
    .filter((id) => JSON.stringify(previous.drafts[id]) !== JSON.stringify(next.drafts[id]))
    .map((id) => [id, next.drafts[id] ?? null]));
  const remove = {
    campaigns: previous.campaigns.filter((item) => !next.campaigns.some((candidate) => candidate.id === item.id)).map((item) => item.id),
    participants: previous.participants.filter((item) => !next.participants.some((candidate) => candidate.id === item.id)).map((item) => item.id),
    drafts: Object.keys(previous.drafts).filter((id) => !(id in next.drafts)),
    results: previous.results.filter((item) => !next.results.some((candidate) => candidate.participantId === item.participantId)).map((item) => item.participantId)
  };
  return {
    ...(campaigns.length ? { campaigns } : {}),
    ...(participants.length ? { participants } : {}),
    ...(Object.keys(drafts).length ? { drafts } : {}),
    ...(results.length ? { results } : {}),
    ...(JSON.stringify(previous.questionBank) !== JSON.stringify(next.questionBank) ? { questionBank: next.questionBank } : {}),
    ...(Object.values(remove).some((ids) => ids.length) ? { remove } : {})
  };
}

function normalizeName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("zh-CN");
}

function isAssessmentDraft(value: AssessmentDraft | AnswerMap): value is AssessmentDraft {
  const answers = (value as Partial<AssessmentDraft>).answers;
  return Boolean(answers && typeof answers === "object" && !Array.isArray(answers));
}

export interface AssessmentRepository {
  initialize(options?: { persistMigration?: boolean }): Promise<void>;
  refresh(): Promise<void>;
  flush(): Promise<void>;
  createCampaign(input: Pick<AssessmentCampaign, "name">): AssessmentCampaign;
  listCampaigns(): AssessmentCampaign[];
  getCampaign(campaignId: string): AssessmentCampaign | undefined;
  setCampaignStatus(campaignId: string, status: CampaignStatus): AssessmentCampaign;
  deleteCampaign(campaignId: string): AssessmentCampaign;
  importParticipants(campaignId: string, rows: RosterRow[]): ImportReport;
  copyParticipants(sourceCampaignId: string, targetCampaignId: string): {
    imported: Participant[];
    skipped: Array<Pick<RosterRow, "name" | "department">>;
  };
  listParticipants(campaignId: string): Participant[];
  getParticipant(participantId: string): Participant | undefined;
  getParticipantByToken(token: string): Participant | undefined;
  findParticipantByName(name: string): Participant | undefined;
  authenticateParticipant(token: string, name: string): Promise<void>;
  verifyParticipantName(token: string, name: string): Participant | undefined;
  getQuestionBank(): QuestionBank;
  saveQuestionBank(markdown: string): QuestionBank;
  saveDraft(participantId: string, draft: AssessmentDraft | AnswerMap): void;
  getDraft(participantId: string): AssessmentDraft | undefined;
  submitAssessment(participantId: string, answers: AnswerMap, elapsedSeconds: number): AssessmentResult;
  getResult(participantId: string): AssessmentResult | undefined;
  listResults(campaignId: string): StoredResult[];
  reset(): void;
}

export function createAssessmentRepository(storageKey = defaultStorageKey): AssessmentRepository {
  let remoteEnabled = false;
  let remoteState = emptyState();
  let persistQueue = Promise.resolve();
  let writeGeneration = 0;

  const read = (): AssessmentState => {
    if (remoteEnabled) return cloneState(remoteState);
    const raw = typeof localStorage === "undefined" ? memoryStorage.get(storageKey) : localStorage.getItem(storageKey);
    if (!raw) return emptyState();
    try {
      return normalizeState(JSON.parse(raw) as Partial<AssessmentState>);
    } catch {
      return emptyState();
    }
  };

  const write = (state: AssessmentState) => {
    if (remoteEnabled) {
      const patch = createStatePatch(remoteState, state);
      if (!Object.keys(patch).length) return;
      remoteState = cloneState(state);
      const generation = ++writeGeneration;
      persistQueue = persistQueue.then(async () => {
        const response = await fetch("/api/state", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        const body = await response.json().catch(() => ({})) as Partial<AssessmentState> & { error?: string };
        if (!response.ok) throw new Error(body.error || "服务器未能保存数据");
        if (generation === writeGeneration) remoteState = normalizeState(body);
      });
      return;
    }
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
    async initialize(options = {}) {
      const response = await fetch("/api/state", { headers: { Accept: "application/json" } });
      const body = await response.json().catch(() => ({})) as Partial<AssessmentState> & { error?: string };
      if (!response.ok) throw new Error(body.error || "无法读取服务器数据");
      const normalized = normalizeState(body);
      const originalCampaigns = new Map((Array.isArray(body.campaigns) ? body.campaigns : []).map((campaign) => [campaign.id, campaign]));
      const changedCampaigns = normalized.campaigns
        .filter((campaign) => originalCampaigns.get(campaign.id)?.questionVersion !== campaign.questionVersion)
        .map(({ id, questionVersion }) => ({ id, questionVersion }));
      const migrationPatch: AssessmentStatePatch = {
        ...(!body.questionBank || JSON.stringify(body.questionBank) !== JSON.stringify(normalized.questionBank) ? { questionBank: normalized.questionBank } : {}),
        ...(changedCampaigns.length ? { campaigns: changedCampaigns } : {})
      };
      remoteState = normalized;
      remoteEnabled = true;
      persistQueue = Promise.resolve();
      writeGeneration = 0;
      if (options.persistMigration && Object.keys(migrationPatch).length) {
        const migrationResponse = await fetch("/api/state", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(migrationPatch)
        });
        const migrationBody = await migrationResponse.json().catch(() => ({})) as Partial<AssessmentState> & { error?: string };
        if (!migrationResponse.ok) throw new Error(migrationBody.error || "question bank migration failed");
        remoteState = normalizeState(migrationBody);
      }
    },

    async refresh() {
      if (remoteEnabled) await repository.initialize();
    },

    async flush() {
      await persistQueue;
    },

    createCampaign(input) {
      const state = read();
      const campaign: AssessmentCampaign = {
        id: makeId("campaign"),
        name: input.name.trim() || "未命名测评批次",
        status: "open",
        questionVersion: state.questionBank.version,
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
      if (status === "open") campaign.questionVersion = state.questionBank.version;
      write(state);
      return campaign;
    },

    deleteCampaign(campaignId) {
      const state = read();
      const campaign = requireCampaign(state, campaignId);
      const participantIds = new Set(state.participants.filter((person) => person.campaignId === campaignId).map((person) => person.id));
      state.campaigns = state.campaigns.filter((item) => item.id !== campaignId);
      state.participants = state.participants.filter((person) => person.campaignId !== campaignId);
      state.results = state.results.filter((item) => item.campaignId !== campaignId && !participantIds.has(item.participantId));
      participantIds.forEach((participantId) => { delete state.drafts[participantId]; });
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

    copyParticipants(sourceCampaignId, targetCampaignId) {
      const state = read();
      requireCampaign(state, sourceCampaignId);
      requireCampaign(state, targetCampaignId);
      if (sourceCampaignId === targetCampaignId) throw new Error("源批次和目标批次不能相同");
      const identities = new Set(state.participants
        .filter((person) => person.campaignId === targetCampaignId)
        .map((person) => `${person.name}|${person.department}`));
      const imported: Participant[] = [];
      const skipped: Array<Pick<RosterRow, "name" | "department">> = [];
      state.participants
        .filter((person) => person.campaignId === sourceCampaignId)
        .forEach((sourcePerson) => {
          const identity = `${sourcePerson.name}|${sourcePerson.department}`;
          if (identities.has(identity)) {
            skipped.push({ name: sourcePerson.name, department: sourcePerson.department });
            return;
          }
          identities.add(identity);
          const participant: Participant = {
            id: makeId("participant"),
            campaignId: targetCampaignId,
            name: sourcePerson.name,
            department: sourcePerson.department,
            position: sourcePerson.position,
            token: makeId("invite")
          };
          state.participants.push(participant);
          imported.push(participant);
        });
      write(state);
      return { imported, skipped };
    },

    listParticipants(campaignId) {
      return read().participants.filter((person) => person.campaignId === campaignId);
    },

    getParticipant(participantId) {
      return read().participants.find((person) => person.id === participantId);
    },

    getParticipantByToken(token) {
      return read().participants.find((person) => person.token === token);
    },

    findParticipantByName(name) {
      const normalized = normalizeName(name);
      if (!normalized || normalized.length > 60) return undefined;
      const state = read();
      const openCampaignIds = new Set(state.campaigns.filter((campaign) => campaign.status === "open").map((campaign) => campaign.id));
      const matches = state.participants.filter((person) => openCampaignIds.has(person.campaignId) && normalizeName(person.name) === normalized);
      // ponytail: name-only entry rejects duplicates; add an employee ID if duplicate names must be supported.
      if (matches.length !== 1) return undefined;
      return matches[0];
    },

    async authenticateParticipant(token, name) {
      if (!remoteEnabled) return;
      const response = await fetch("/api/participant/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, participantId: token, name })
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (response.ok) await repository.initialize();
      if (!response.ok) throw new Error(body.error || "身份验证失败，请重新输入姓名。");
    },

    verifyParticipantName(token, name) {
      const normalized = normalizeName(name);
      if (!normalized || normalized.length > 60) return undefined;
      const state = read();
      const participant = state.participants.find((person) => person.token === token && normalizeName(person.name) === normalized);
      if (!participant) return undefined;
      if (!participant.visitedAt) {
        participant.visitedAt = new Date().toISOString();
        write(state);
      }
      return participant;
    },

    getQuestionBank() {
      const bank = read().questionBank;
      return { ...bank, questions: parseQuestionMarkdown(bank.markdown) };
    },

    saveQuestionBank(markdown) {
      const parsedQuestions = parseQuestionMarkdown(markdown);
      const state = read();
      const versionMatch = state.questionBank.version.match(/^v(\d+)\.(\d+)$/);
      const major = Math.max(3, Number(versionMatch?.[1] ?? 3));
      const revision = Number(versionMatch?.[1]) === 3 ? Number(versionMatch?.[2] ?? 0) + 1 : 1;
      state.questionBank = { version: `v${major}.${revision}`, markdown, updatedAt: new Date().toISOString() };
      state.campaigns.filter((campaign) => campaign.status === "open").forEach((campaign) => { campaign.questionVersion = state.questionBank.version; });
      write(state);
      return { ...state.questionBank, questions: parsedQuestions };
    },

    saveDraft(participantId, draftInput) {
      const state = read();
      const participant = requireParticipant(state, participantId);
      if (state.results.some((item) => item.participantId === participant.id)) return;
      const draft: AssessmentDraft = isAssessmentDraft(draftInput)
        ? draftInput
        : {
          questionVersion: state.questionBank.version,
          activeLevel: 1,
          startedAt: new Date().toISOString(),
          answers: draftInput
        } satisfies AssessmentDraft;
      state.drafts[participantId] = {
        ...draft,
        answers: { ...draft.answers },
        questionVersion: draft.questionVersion || state.questionBank.version,
        activeLevel: Math.max(1, Math.min(8, draft.activeLevel || 1)),
        startedAt: draft.startedAt || new Date().toISOString()
      };
      write(state);
    },

    getDraft(participantId) {
      return read().drafts[participantId];
    },

    submitAssessment(participantId, answers, elapsedSeconds) {
      const state = read();
      const participant = requireParticipant(state, participantId);
      const campaign = requireCampaign(state, participant.campaignId);
      if (campaign.status !== "open") throw new Error("当前测评批次未开放");
      if (state.results.some((item) => item.participantId === participantId)) throw new Error("该员工已完成本批次测评");
      const bankQuestions = parseQuestionMarkdown(state.questionBank.markdown);
      const optionIds = new Map(bankQuestions.map((question) => [question.id, new Set(question.options.map((option) => option.id))]));
      if (Object.entries(answers).some(([questionId, optionId]) => !optionIds.get(questionId)?.has(optionId))) {
        throw new Error("答案包含无效题目或选项");
      }
      if (state.drafts[participantId]?.resetRequired) throw new Error("题库已升级，请重新开始测评");
      const result = scoreAdaptiveAssessment(answers, elapsedSeconds, bankQuestions, `${participantId}:${state.questionBank.version}`);
      const attemptedIds = new Set(result.stageResults?.flatMap((stage) => stage.questionIds) ?? []);
      if (Object.keys(answers).some((questionId) => !attemptedIds.has(questionId))) throw new Error("答案包含未抽取或已锁定的题目");
      state.results.push({ participantId, campaignId: participant.campaignId, questionVersion: state.questionBank.version, answers, elapsedSeconds, result });
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

    reset() {
      write(emptyState());
    }
  };

  return repository;
}

export const assessmentRepository = createAssessmentRepository();
