import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const maxBodyBytes = 5 * 1024 * 1024;
const defaultAdminPassword = "admin123";
const adminSessionCookie = "ai_admin_session";
const adminSessionLifetimeMs = 8 * 60 * 60 * 1000;
const participantSessionCookie = "ai_participant_session";
const participantSessionLifetimeMs = 8 * 60 * 60 * 1000;

function emptyState() {
  return { campaigns: [], roster: [], participants: [], drafts: {}, results: [] };
}

function normalizeState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSON 数据文件格式无效");
  return {
    campaigns: Array.isArray(value.campaigns) ? value.campaigns : [],
    roster: Array.isArray(value.roster) ? value.roster : [],
    participants: Array.isArray(value.participants) ? value.participants : [],
    drafts: value.drafts && typeof value.drafts === "object" && !Array.isArray(value.drafts) ? value.drafts : {},
    results: Array.isArray(value.results) ? value.results : [],
    ...(value.questionBank && typeof value.questionBank === "object" ? { questionBank: value.questionBank } : {})
  };
}

function publicState(state) {
  const openCampaignIds = new Set(state.campaigns.filter((campaign) => campaign.status === "open").map((campaign) => campaign.id));
  return {
    campaigns: state.campaigns,
    participants: state.participants.filter((participant) => openCampaignIds.has(participant.campaignId)).map((participant) => ({
      id: participant.id,
      campaignId: participant.campaignId,
      name: participant.name,
      department: participant.department,
      position: participant.position
    })),
    drafts: {},
    results: []
  };
}

function participantState(state, participantId) {
  const participant = state.participants.find((item) => item.id === participantId);
  if (!participant) return publicState(state);
  const campaign = state.campaigns.find((item) => item.id === participant.campaignId);
  const draft = state.drafts[participant.id];
  return {
    campaigns: campaign ? [campaign] : [],
    participants: [participant],
    drafts: draft ? { [participant.id]: draft } : {},
    results: state.results.filter((result) => result.participantId === participant.id),
    ...(state.questionBank ? { questionBank: state.questionBank } : {})
  };
}

function mergeByKey(current, updates, key) {
  const merged = [...current];
  for (const update of updates) {
    if (!update || typeof update !== "object" || typeof update[key] !== "string") throw new Error("数据补丁包含无效记录");
    const index = merged.findIndex((item) => item[key] === update[key]);
    if (index === -1) merged.push(update);
    else merged[index] = { ...merged[index], ...update };
  }
  return merged;
}

function removalSet(remove, key) {
  if (remove === undefined) return new Set();
  if (!remove || typeof remove !== "object" || Array.isArray(remove)) throw new Error("删除补丁格式无效");
  const ids = remove[key];
  if (ids === undefined) return new Set();
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id)) throw new Error("删除补丁包含无效 ID");
  return new Set(ids);
}

export function mergeStatePatch(currentValue, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("数据补丁格式无效");
  const current = normalizeState(currentValue);
  const next = { ...current };
  const removedCampaigns = removalSet(patch.remove, "campaigns");
  const removedRoster = removalSet(patch.remove, "roster");
  const removedParticipants = removalSet(patch.remove, "participants");
  const removedDrafts = removalSet(patch.remove, "drafts");
  const removedResults = removalSet(patch.remove, "results");
  const campaignParticipantIds = new Set(current.participants
    .filter((participant) => removedCampaigns.has(participant.campaignId))
    .map((participant) => participant.id));
  for (const participantId of removedParticipants) {
    if (campaignParticipantIds.has(participantId)) continue;
    const hasDraft = participantId in current.drafts;
    const hasResult = current.results.some((result) => result.participantId === participantId);
    if (hasDraft || hasResult) {
      const error = new Error("该人员已有测评记录，不能从批次中移除");
      error.statusCode = 409;
      throw error;
    }
  }
  const removedParticipantIds = new Set([...removedParticipants, ...campaignParticipantIds]);
  next.campaigns = current.campaigns.filter((campaign) => !removedCampaigns.has(campaign.id));
  next.roster = current.roster.filter((person) => !removedRoster.has(person.id));
  next.participants = current.participants.filter((participant) => !removedParticipantIds.has(participant.id));
  next.results = current.results.filter((result) => !removedParticipantIds.has(result.participantId) && !removedResults.has(result.participantId));
  next.drafts = { ...current.drafts };
  removedDrafts.forEach((participantId) => delete next.drafts[participantId]);
  campaignParticipantIds.forEach((participantId) => delete next.drafts[participantId]);
  if (patch.campaigns !== undefined) {
    if (!Array.isArray(patch.campaigns)) throw new Error("批次数据格式无效");
    next.campaigns = mergeByKey(next.campaigns, patch.campaigns, "id");
  }
  if (patch.roster !== undefined) {
    if (!Array.isArray(patch.roster)) throw new Error("花名册数据格式无效");
    next.roster = mergeByKey(next.roster, patch.roster, "id");
  }
  if (patch.participants !== undefined) {
    if (!Array.isArray(patch.participants)) throw new Error("人员数据格式无效");
    next.participants = mergeByKey(next.participants, patch.participants, "id");
  }
  if (patch.results !== undefined) {
    if (!Array.isArray(patch.results)) throw new Error("答卷数据格式无效");
    for (const result of patch.results) {
      const existing = next.results.find((item) => item.participantId === result?.participantId);
      if (existing && JSON.stringify(existing) !== JSON.stringify(result)) {
        const error = new Error("该员工的答卷已经提交");
        error.statusCode = 409;
        throw error;
      }
    }
    next.results = mergeByKey(next.results, patch.results, "participantId");
  }
  if (patch.drafts !== undefined) {
    if (!patch.drafts || typeof patch.drafts !== "object" || Array.isArray(patch.drafts)) throw new Error("草稿数据格式无效");
    for (const [participantId, answers] of Object.entries(patch.drafts)) {
      if (answers === null) delete next.drafts[participantId];
      else if (!next.results.some((item) => item.participantId === participantId)) next.drafts[participantId] = answers;
    }
  }
  if (patch.questionBank !== undefined) {
    if (!patch.questionBank || typeof patch.questionBank !== "object" || Array.isArray(patch.questionBank)) throw new Error("题库数据格式无效");
    next.questionBank = patch.questionBank;
  }
  return next;
}

export async function readStateFile(dataFile) {
  try {
    return normalizeState(JSON.parse(await readFile(dataFile, "utf8")));
  } catch (error) {
    if (error?.code === "ENOENT") return emptyState();
    throw error;
  }
}

export async function writeStateFile(dataFile, state) {
  await mkdir(dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(normalizeState(state), null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryFile, dataFile);
}

function sendJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  response.end(JSON.stringify(body));
}

function readCookie(request, name) {
  const cookies = String(request.headers.cookie || "").split(";");
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator !== -1 && cookie.slice(0, separator).trim() === name) return cookie.slice(separator + 1).trim();
  }
  return "";
}

function passwordMatches(actual, expected) {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function adminCookie(request, token, maxAge) {
  const secure = request.headers["x-forwarded-proto"] === "https" || request.socket.encrypted;
  return `${adminSessionCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function participantCookie(request, token, maxAge) {
  const secure = request.headers["x-forwarded-proto"] === "https" || request.socket.encrypted;
  return `${participantSessionCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function normalizeParticipantName(name) {
  if (typeof name !== "string" || name.length > 60) return "";
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("zh-CN");
}

function participantPatchTargets(patch) {
  const targets = new Set();
  if (Array.isArray(patch.participants)) patch.participants.forEach((update) => targets.add(update?.id));
  if (patch.drafts && typeof patch.drafts === "object" && !Array.isArray(patch.drafts)) Object.keys(patch.drafts).forEach((id) => targets.add(id));
  if (Array.isArray(patch.results)) patch.results.forEach((result) => targets.add(result?.participantId));
  if (patch.remove && typeof patch.remove === "object" && !Array.isArray(patch.remove) && Array.isArray(patch.remove.drafts)) {
    patch.remove.drafts.forEach((id) => targets.add(id));
  }
  return targets;
}

function parseAssessmentQuestions(markdown) {
  if (typeof markdown !== "string" || markdown.length > 1_000_000) throw new Error("invalid question bank");
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  const starts = lines.flatMap((line, index) => line.startsWith("## ") ? [index] : []);
  const questions = starts.map((start, questionIndex) => {
    const header = lines[start].match(/^##\s+([A-Za-z0-9_-]+)\s*\|\s*L([1-8])\s*\|\s*(office|scenario|workflow|innovation)\s*\|/);
    if (!header) throw new Error("invalid question header");
    const [, id, levelText, dimension] = header;
    const end = starts[questionIndex + 1] ?? lines.length;
    const options = lines.slice(start + 1, end).flatMap((line) => {
      const match = line.match(/^-\s+\[([0-3])]\s+(.+)$/);
      return match ? [{ id: `${id}-option-${match[1]}`, score: Number(match[1]), label: match[2].trim() }] : [];
    });
    if (options.length !== 4 || new Set(options.map((option) => option.score)).size !== 4) throw new Error("invalid question options");
    return { id, level: Number(levelText), dimension, options };
  });
  if (!questions.length || new Set(questions.map((question) => question.id)).size !== questions.length) throw new Error("invalid question bank");
  return questions;
}

function stableAssessmentOrder(items, seed) {
  const ordered = [...items];
  let state = [...seed].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  }
  return ordered;
}

function expectedAdaptiveSubmission(participant, campaign, questionBank, submitted) {
  if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) throw new Error("invalid result");
  if (submitted.participantId !== participant.id || submitted.campaignId !== campaign.id) throw new Error("result target mismatch");
  if (submitted.questionVersion !== questionBank.version) throw new Error("question bank version mismatch");
  if (!Number.isFinite(submitted.elapsedSeconds) || submitted.elapsedSeconds < 0) throw new Error("invalid elapsed time");
  if (!submitted.answers || typeof submitted.answers !== "object" || Array.isArray(submitted.answers)) throw new Error("invalid answers");
  const questions = parseAssessmentQuestions(questionBank.markdown);
  const byId = new Map(questions.map((question) => [question.id, question]));
  const seed = `${participant.id}:${questionBank.version}`;
  const answerEntries = Object.entries(submitted.answers);
  if (answerEntries.some(([id, optionId]) => !byId.has(id) || typeof optionId !== "string")) throw new Error("unknown answer");
  const stageResults = [];
  const attempted = [];
  let level = 0;
  for (let stageLevel = 1; stageLevel <= 8; stageLevel += 1) {
    const stage = stableAssessmentOrder(questions.filter((question) => question.level === stageLevel), `${seed}:L${stageLevel}`).slice(0, 5);
    if (stage.length < 5) throw new Error("incomplete question bank");
    const scoreFor = (question) => question.options.find((option) => option.id === submitted.answers[question.id])?.score;
    const scores = stage.map(scoreFor);
    if (scores.some((score) => score === undefined)) throw new Error("incomplete adaptive path");
    const questionCount = 5;
    const totalScore = scores.reduce((total, score) => total + score, 0);
    const status = totalScore >= 10 ? "passed" : "failed";
    const questionIds = stage.map((question) => question.id);
    attempted.push(...stage);
    stageResults.push({ level: stageLevel, questionIds, questionCount, totalScore, status });
    if (status === "failed") break;
    level = stageLevel;
  }
  const finalStage = stageResults.at(-1);
  if (!finalStage || (finalStage.status === "passed" && level < 8)) throw new Error("incomplete adaptive path");
  const attemptedIds = new Set(attempted.map((question) => question.id));
  if (answerEntries.length !== attemptedIds.size || answerEntries.some(([id]) => !attemptedIds.has(id))) throw new Error("answers include unattempted questions");
  const totalScore = attempted.reduce((total, question) => total + question.options.find((option) => option.id === submitted.answers[question.id]).score, 0);
  const maxScore = attempted.length * 3;
  const dimensionScores = Object.fromEntries(["office", "scenario", "workflow", "innovation"].map((dimension) => {
    const values = attempted.filter((question) => question.dimension === dimension).map((question) => question.options.find((option) => option.id === submitted.answers[question.id]).score);
    return [dimension, values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length / 3) * 100) : null];
  }));
  const weakDimensions = ["office", "scenario", "workflow", "innovation"]
    .filter((dimension) => dimensionScores[dimension] !== null)
    .sort((left, right) => dimensionScores[left] - dimensionScores[right]).slice(0, 2);
  const boundary = stageResults.some((stage) => stage.questionCount === 5 && (stage.totalScore === 9 || stage.totalScore === 10));
  const expected = {
    level,
    totalScore,
    maxScore,
    scorePercent: Math.round((totalScore / maxScore) * 100),
    levelAverages: Object.fromEntries(stageResults.map((stage) => [stage.level, stage.totalScore / stage.questionCount])),
    dimensionScores,
    weakDimensions,
    answeredQuestionCount: attempted.length,
    stoppedAtLevel: finalStage.level,
    stageResults,
    confidence: submitted.elapsedSeconds < attempted.length * 9 || boundary ? "low" : "high",
    reviewRequired: level >= 6
  };
  const actual = submitted.result;
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) throw new Error("invalid result");
  for (const key of ["level", "totalScore", "maxScore", "scorePercent", "answeredQuestionCount", "stoppedAtLevel", "confidence", "reviewRequired"]) {
    if (actual[key] !== expected[key]) throw new Error("result score mismatch");
  }
  if (JSON.stringify(actual.levelAverages) !== JSON.stringify(expected.levelAverages)
    || JSON.stringify(actual.dimensionScores) !== JSON.stringify(expected.dimensionScores)
    || JSON.stringify(actual.weakDimensions) !== JSON.stringify(expected.weakDimensions)
    || JSON.stringify(actual.stageResults) !== JSON.stringify(expected.stageResults)) throw new Error("result path mismatch");
  if (!actual.grade || typeof actual.grade !== "object" || Array.isArray(actual.grade) || actual.grade.level !== level) throw new Error("result grade mismatch");
  return {
    ...submitted,
    result: {
      ...actual,
      grade: { level, code: `L${level}`, name: `L${level}`, capability: "", color: "", tasks: [] },
      completedAt: new Date().toISOString()
    }
  };
}

function patchRequiresAdmin(state, patch) {
  if (patch.remove && typeof patch.remove === "object" && !Array.isArray(patch.remove)
    && ["campaigns", "roster", "participants", "results"].some((key) => Array.isArray(patch.remove[key]) && patch.remove[key].length > 0)) return true;
  if (patch.campaigns !== undefined || patch.roster !== undefined || patch.questionBank !== undefined) return true;
  if (!Array.isArray(patch.participants)) return false;
  return patch.participants.some((update) => {
    const existing = state.participants.find((participant) => participant.id === update?.id);
    if (!existing) return true;
    return Object.keys(update).some((key) => !["id", "visitedAt", "completedAt"].includes(key));
  });
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (declaredLength > maxBodyBytes) throw Object.assign(new Error("请求数据超过 5 MB"), { statusCode: 413 });
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maxBodyBytes) throw Object.assign(new Error("请求数据超过 5 MB"), { statusCode: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("请求不是有效的 JSON"), { statusCode: 400 });
  }
}

export function createJsonApiHandler(dataFile = process.env.DATA_FILE || resolve(root, "data", "assessment.json"), {
  adminPassword = process.env.ADMIN_PASSWORD || defaultAdminPassword
} = {}) {
  let writeQueue = Promise.resolve();
  const sessions = new Map();
  const participantSessions = new Map();
  const loginAttempts = new Map();
  const isAdmin = (request) => {
    const token = readCookie(request, adminSessionCookie);
    const expiresAt = sessions.get(token) ?? 0;
    if (expiresAt > Date.now()) return true;
    if (token) sessions.delete(token);
    return false;
  };
  const participantSessionId = (request) => {
    const token = readCookie(request, participantSessionCookie);
    const session = participantSessions.get(token);
    if (session?.expiresAt > Date.now()) return session.participantId;
    if (token) participantSessions.delete(token);
    return "";
  };
  return async function jsonApiHandler(request, response, next) {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    if (pathname === "/api/admin/session" && request.method === "GET") {
      sendJson(response, 200, { authenticated: isAdmin(request) });
      return;
    }
    if (pathname === "/api/admin/login" && request.method === "POST") {
      try {
        const address = request.socket.remoteAddress || "unknown";
        const now = Date.now();
        const attempt = loginAttempts.get(address);
        const activeAttempt = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + 15 * 60 * 1000 };
        // ponytail: the in-memory limiter resets on restart; move it to the gateway if multiple server instances are introduced.
        if (activeAttempt.count >= 5) {
          sendJson(response, 429, { error: "尝试次数过多，请 15 分钟后再试。" });
          return;
        }
        const body = await readJsonBody(request);
        if (typeof body?.password !== "string" || body.password.length > 256 || !passwordMatches(body.password, adminPassword)) {
          activeAttempt.count += 1;
          loginAttempts.set(address, activeAttempt);
          sendJson(response, 401, { error: "管理员密码错误。" });
          return;
        }
        loginAttempts.delete(address);
        const token = randomBytes(32).toString("hex");
        sessions.set(token, now + adminSessionLifetimeMs);
        sendJson(response, 200, { authenticated: true }, { "Set-Cookie": adminCookie(request, token, Math.floor(adminSessionLifetimeMs / 1000)) });
      } catch (error) {
        sendJson(response, Number(error?.statusCode) || 400, { error: error instanceof Error ? error.message : "登录失败" });
      }
      return;
    }
    if (pathname === "/api/admin/logout" && request.method === "POST") {
      sessions.delete(readCookie(request, adminSessionCookie));
      sendJson(response, 200, { authenticated: false }, { "Set-Cookie": adminCookie(request, "", 0) });
      return;
    }
    if (pathname === "/api/participant/session" && request.method === "POST") {
      try {
        const body = await readJsonBody(request);
        const state = await readStateFile(dataFile);
        const normalizedName = normalizeParticipantName(body?.name);
        const participant = state.participants.find((person) => (person.token === body?.token || person.id === body?.participantId)
          && normalizeParticipantName(person.name) === normalizedName);
        const campaign = participant && state.campaigns.find((item) => item.id === participant.campaignId);
        if (!participant || !normalizedName || campaign?.status !== "open") {
          sendJson(response, 401, { error: "名单身份验证失败，请重新输入姓名。" });
          return;
        }
        const token = randomBytes(32).toString("hex");
        participantSessions.set(token, { participantId: participant.id, expiresAt: Date.now() + participantSessionLifetimeMs });
        sendJson(response, 200, { authenticated: true }, { "Set-Cookie": participantCookie(request, token, Math.floor(participantSessionLifetimeMs / 1000)) });
      } catch (error) {
        sendJson(response, Number(error?.statusCode) || 400, { error: error instanceof Error ? error.message : "身份验证失败" });
      }
      return;
    }
    if (pathname !== "/api/state") {
      if (next) next();
      else sendJson(response, 404, { error: "接口不存在" });
      return;
    }
    try {
      if (request.method === "GET") {
        const state = await readStateFile(dataFile);
        const participantId = participantSessionId(request);
        sendJson(response, 200, isAdmin(request) ? state : participantId ? participantState(state, participantId) : publicState(state));
        return;
      }
      if (request.method === "PATCH") {
        const patch = await readJsonBody(request);
        const operation = writeQueue.then(async () => {
          const currentState = await readStateFile(dataFile);
          const adminAuthenticated = isAdmin(request);
          if (patchRequiresAdmin(currentState, patch) && !adminAuthenticated) throw Object.assign(new Error("管理员登录已失效，请重新登录。"), { statusCode: 401 });
          if (!adminAuthenticated) {
            const targets = participantPatchTargets(patch);
            const authenticatedParticipantId = participantSessionId(request);
            if (targets.size > 0 && (targets.size !== 1 || !targets.has(authenticatedParticipantId))) {
              throw Object.assign(new Error("员工身份验证已失效，请重新输入姓名。"), { statusCode: 401 });
            }
          }
          if (!adminAuthenticated && Array.isArray(patch.results) && patch.results.length) {
            const authenticatedParticipantId = participantSessionId(request);
            const participant = currentState.participants.find((item) => item.id === authenticatedParticipantId);
            const campaign = participant && currentState.campaigns.find((item) => item.id === participant.campaignId);
            if (!participant || !campaign || campaign.status !== "open" || currentState.results.some((item) => item.participantId === participant.id)) {
              throw Object.assign(new Error("assessment is not accepting submissions"), { statusCode: 409 });
            }
            if (patch.results.length !== 1) throw Object.assign(new Error("one result per submission"), { statusCode: 400 });
            try {
              patch.results[0] = expectedAdaptiveSubmission(participant, campaign, currentState.questionBank, patch.results[0]);
              if (Array.isArray(patch.participants)) {
                patch.participants = patch.participants.map((update) => update?.id === participant.id
                  ? { ...update, completedAt: patch.results[0].result.completedAt }
                  : update);
              }
            } catch (error) {
              throw Object.assign(error instanceof Error ? error : new Error("invalid assessment result"), { statusCode: 400 });
            }
          }
          const nextState = mergeStatePatch(currentState, patch);
          await writeStateFile(dataFile, nextState);
          return nextState;
        });
        writeQueue = operation.catch(() => undefined);
        sendJson(response, 200, await operation);
        return;
      }
      response.setHeader("Allow", "GET, PATCH");
      sendJson(response, 405, { error: "请求方法不受支持" });
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 500;
      if (statusCode >= 500) console.error(error);
      sendJson(response, statusCode, { error: error instanceof Error ? error.message : "服务器保存失败" });
    }
  };
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

async function serveStatic(request, response, staticDirectory) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
  if (pathname === "/healthz") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    response.end("ok\n");
    return;
  }
  let file = resolve(staticDirectory, `.${pathname}`);
  if (file !== staticDirectory && !file.startsWith(`${staticDirectory}${sep}`)) {
    response.writeHead(400);
    response.end();
    return;
  }
  try {
    if (!(await stat(file)).isFile()) throw Object.assign(new Error("not a file"), { code: "ENOENT" });
  } catch (error) {
    if (error?.code !== "ENOENT" || extname(pathname)) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500);
      response.end();
      return;
    }
    file = resolve(staticDirectory, "index.html");
  }
  const extension = extname(file).toLowerCase();
  response.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream",
    "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=604800, immutable",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin"
  });
  if (request.method === "HEAD") response.end();
  else createReadStream(file).on("error", () => response.destroy()).pipe(response);
}

export function startServer({
  port = Number(process.env.PORT || 3000),
  host = process.env.HOST || "0.0.0.0",
  dataFile = process.env.DATA_FILE || resolve(root, "data", "assessment.json"),
  staticDirectory = process.env.STATIC_DIR || resolve(root, "dist"),
  adminPassword = process.env.ADMIN_PASSWORD || defaultAdminPassword
} = {}) {
  const apiHandler = createJsonApiHandler(dataFile, { adminPassword });
  const server = createServer((request, response) => {
    if ((request.url || "").startsWith("/api/")) void apiHandler(request, response);
    else void serveStatic(request, response, staticDirectory).catch((error) => {
      console.error(error);
      if (!response.headersSent) response.writeHead(error instanceof URIError ? 400 : 500);
      response.end();
    });
  });
  return server.listen(port, host, () => console.log(`AI assessment server listening on http://${host}:${port}`));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startServer();
