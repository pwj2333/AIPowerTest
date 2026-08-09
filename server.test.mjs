import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { once } from "node:events";
import { join } from "node:path";
import test from "node:test";
import { mergeStatePatch, readStateFile, startServer, writeStateFile } from "./server.mjs";

function stableOrder(items, seed) {
  const ordered = [...items];
  let state = [...seed].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 7);
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  }
  return ordered;
}

function adaptiveFixture(participantId = "p1", version = "v3.0") {
  const idsByLevel = Array.from({ length: 8 }, (_, levelIndex) => Array.from({ length: 5 }, (_, questionIndex) => `q${levelIndex + 1}${questionIndex + 1}`));
  const markdown = ["# Test question bank", ...idsByLevel.flatMap((ids, levelIndex) => ids.map((id) => [
    `## ${id} | L${levelIndex + 1} | office | test`,
    `> Question ${id}`,
    ...[0, 1, 2, 3].map((score) => `- [${score}] Option ${score} for ${id}`)
  ].join("\n")))].join("\n\n");
  const answers = {};
  const stageResults = idsByLevel.map((ids, levelIndex) => {
    const questionIds = stableOrder(ids, `${participantId}:${version}:L${levelIndex + 1}`).slice(0, 5);
    questionIds.forEach((id) => { answers[id] = `${id}-option-3`; });
    return { level: levelIndex + 1, questionIds, questionCount: 5, totalScore: 15, status: "passed" };
  });
  const levelAverages = Object.fromEntries(stageResults.map((stage) => [stage.level, 3]));
  return {
    questionBank: { version, markdown, updatedAt: "2026-08-04T00:00:00.000Z" },
    submission: {
      participantId,
      campaignId: "c1",
      questionVersion: version,
      answers,
      elapsedSeconds: 600,
      result: {
        level: 8,
        grade: { level: 8, code: "L8", name: "Level 8", capability: "capability", color: "#000", tasks: ["task 1", "task 2", "task 3"] },
        totalScore: 120,
        maxScore: 120,
        scorePercent: 100,
        levelAverages,
        dimensionScores: { office: 100, scenario: null, workflow: null, innovation: null },
        weakDimensions: ["office"],
        answeredQuestionCount: 40,
        stoppedAtLevel: 8,
        stageResults,
        confidence: "high",
        reviewRequired: true,
        completedAt: "2026-08-04T00:00:00.000Z"
      }
    }
  };
}

test("persists JSON state and atomically replaces the previous file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-assessment-"));
  const file = join(directory, "assessment.json");
  try {
    await writeStateFile(file, { campaigns: [], participants: [], drafts: {}, results: [] });
    await writeStateFile(file, { campaigns: [{ id: "c1", name: "正式测评" }], participants: [], drafts: {}, results: [] });
    assert.equal((await readStateFile(file)).campaigns[0].name, "正式测评");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("merges independent submissions and rejects replacing an existing answer", () => {
  const initial = { campaigns: [], participants: [], drafts: {}, results: [] };
  const first = mergeStatePatch(initial, { results: [{ participantId: "p1", answers: { q1: "a1" } }] });
  const second = mergeStatePatch(first, { results: [{ participantId: "p2", answers: { q1: "a2" } }] });
  assert.deepEqual(second.results.map((result) => result.participantId), ["p1", "p2"]);
  assert.throws(() => mergeStatePatch(second, { results: [{ participantId: "p1", answers: { q1: "changed" } }] }), /已经提交/);
});

test("merges entity fields without reviving stale values", () => {
  const initial = { campaigns: [{ id: "c1", status: "open", questionVersion: "v1.0" }], participants: [], drafts: {}, results: [] };
  const closed = mergeStatePatch(initial, { campaigns: [{ id: "c1", status: "closed" }] });
  const updated = mergeStatePatch(closed, { campaigns: [{ id: "c1", questionVersion: "v1.1" }] });
  assert.deepEqual(updated.campaigns[0], { id: "c1", status: "closed", questionVersion: "v1.1" });
});

test("merges global roster records", () => {
  const initial = { campaigns: [], participants: [], drafts: {}, results: [] };
  const next = mergeStatePatch(initial, {
    roster: [{ id: "r1", name: "Alice", department: "Sales", position: "Lead" }]
  });

  assert.deepEqual(next.roster, [{ id: "r1", name: "Alice", department: "Sales", position: "Lead" }]);
});

test("rejects removing a participant with assessment data that the patch did not remove", () => {
  const current = {
    campaigns: [{ id: "c1", name: "First" }],
    roster: [{ id: "r1", name: "Alice", department: "Sales", position: "Lead" }],
    participants: [{ id: "p1", campaignId: "c1", rosterId: "r1", name: "Alice" }],
    drafts: { p1: { q1: "a1" } },
    results: [{ participantId: "p1", campaignId: "c1" }]
  };

  assert.throws(() => mergeStatePatch(current, { remove: { participants: ["p1"] } }), /测评记录/);
  assert.throws(() => mergeStatePatch(current, {
    remove: { participants: ["p1"], drafts: ["p1"], results: ["p1"] }
  }), /测评记录/);
});

test("cascades current participant data when a campaign is removed", () => {
  const current = {
    campaigns: [{ id: "c1", name: "First" }],
    roster: [{ id: "r1", name: "Alice", department: "Sales", position: "Lead" }],
    participants: [{ id: "p1", campaignId: "c1", rosterId: "r1", name: "Alice" }],
    drafts: { p1: { q1: "a1" } },
    results: [{ participantId: "p1", campaignId: "c1" }]
  };

  assert.deepEqual(mergeStatePatch(current, { remove: { campaigns: ["c1"] } }), {
    campaigns: [],
    roster: current.roster,
    participants: [],
    drafts: {},
    results: []
  });
});

test("applies removal patches to every state collection", () => {
  const initial = {
    campaigns: [{ id: "c1", name: "remove me" }],
    participants: [{ id: "p1", campaignId: "c1", name: "Alice" }],
    drafts: { p1: { q1: "a1" } },
    results: [{ participantId: "p1", campaignId: "c1" }]
  };

  const next = mergeStatePatch(initial, {
    remove: { campaigns: ["c1"], participants: ["p1"], drafts: ["p1"], results: ["p1"] }
  });

  assert.deepEqual(next, { campaigns: [], roster: [], participants: [], drafts: {}, results: [] });
});

test("requires admin authentication for removal patches", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-assessment-remove-api-"));
  const dataFile = join(directory, "assessment.json");
  await writeStateFile(dataFile, {
    campaigns: [{ id: "c1", name: "remove me" }],
    roster: [{ id: "r1", name: "Alice", department: "Sales", position: "Lead" }],
    participants: [],
    drafts: {},
    results: []
  });
  const server = startServer({ port: 0, host: "127.0.0.1", dataFile, adminPassword: "remove-password" });
  try {
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address === "object");
    let response = await fetch(`http://127.0.0.1:${address.port}/api/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remove: { campaigns: ["c1"] } })
    });
    assert.equal(response.status, 401);

    response = await fetch(`http://127.0.0.1:${address.port}/api/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remove: { roster: ["r1"] } })
    });
    assert.equal(response.status, 401);

    response = await fetch(`http://127.0.0.1:${address.port}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "remove-password" })
    });
    const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    assert.equal(response.status, 200);
    assert.ok(cookie);
    response = await fetch(`http://127.0.0.1:${address.port}/api/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ remove: { campaigns: ["c1"] } })
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).campaigns, []);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(directory, { recursive: true, force: true });
  }
});

test("permits a rostered participant session to submit without administrator authentication", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-assessment-participant-submit-"));
  const dataFile = join(directory, "assessment.json");
  const fixture = adaptiveFixture();
  await writeStateFile(dataFile, {
    campaigns: [{ id: "c1", status: "open", questionVersion: fixture.questionBank.version }],
    participants: [
      { id: "p1", campaignId: "c1", name: "Alice", department: "Operations", position: "Specialist", token: "invite-p1" },
      { id: "p2", campaignId: "c1", name: "Bob", department: "Operations", position: "Specialist", token: "invite-p2" }
    ],
    drafts: { p1: { q1: "q1-option-1" } },
    results: [],
    questionBank: fixture.questionBank
  });
  const server = startServer({ port: 0, host: "127.0.0.1", dataFile, adminPassword: "submit-password" });
  try {
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const submissionPatch = {
      participants: [{ id: "p1", completedAt: "2026-08-04T00:00:00.000Z" }],
      drafts: { p1: null },
      results: [fixture.submission],
      remove: { drafts: ["p1"] }
    };
    let response = await fetch(`http://127.0.0.1:${address.port}/api/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissionPatch)
    });
    assert.equal(response.status, 401);

    response = await fetch(`http://127.0.0.1:${address.port}/api/participant/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invite-p1", name: "Alice" })
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie);

    response = await fetch(`http://127.0.0.1:${address.port}/api/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(submissionPatch)
    });

    assert.equal(response.status, 200);
    const state = await response.json();
    assert.ok(state.participants[0].completedAt);
    assert.equal(state.results[0].participantId, "p1");
    assert.equal(state.drafts.p1, undefined);

    response = await fetch(`http://127.0.0.1:${address.port}/api/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ drafts: { p2: { q1: "q1-option-2" } }, remove: { drafts: ["p2"] } })
    });
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(directory, { recursive: true, force: true });
  }
});

test("restores API data after a server restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-assessment-api-"));
  const dataFile = join(directory, "assessment.json");
  let server = startServer({ port: 0, host: "127.0.0.1", dataFile, adminPassword: "server-test-password" });
  try {
    await once(server, "listening");
    let address = server.address();
    assert.ok(address && typeof address === "object");
    let response = await fetch(`http://127.0.0.1:${address.port}/api/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaigns: [{ id: "c1", name: "持久化检查" }] })
    });
    assert.equal(response.status, 401);
    response = await fetch(`http://127.0.0.1:${address.port}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" })
    });
    assert.equal(response.status, 401);
    response = await fetch(`http://127.0.0.1:${address.port}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "server-test-password" })
    });
    const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    assert.equal(response.status, 200);
    assert.ok(cookie);
    response = await fetch(`http://127.0.0.1:${address.port}/api/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ campaigns: [{ id: "c1", name: "持久化检查" }] })
    });
    assert.equal(response.status, 200);
    await new Promise((resolveClose) => server.close(resolveClose));

    server = startServer({ port: 0, host: "127.0.0.1", dataFile, adminPassword: "server-test-password" });
    await once(server, "listening");
    address = server.address();
    assert.ok(address && typeof address === "object");
    response = await fetch(`http://127.0.0.1:${address.port}/api/state`);
    assert.equal((await response.json()).campaigns[0].name, "持久化检查");
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects forged participant results", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-assessment-forged-result-"));
  const dataFile = join(directory, "assessment.json");
  await writeStateFile(dataFile, {
    campaigns: [{ id: "c1", status: "open", questionVersion: "v3.0" }],
    participants: [{ id: "p1", campaignId: "c1", name: "Alice", token: "invite-p1" }],
    drafts: {},
    results: [],
    questionBank: { version: "v3.0", markdown: "", updatedAt: "2026-08-04T00:00:00.000Z" }
  });
  const server = startServer({ port: 0, host: "127.0.0.1", dataFile });
  try {
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address === "object");
    let response = await fetch(`http://127.0.0.1:${address.port}/api/participant/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invite-p1", name: "Alice" })
    });
    const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    assert.equal(response.status, 200);
    response = await fetch(`http://127.0.0.1:${address.port}/api/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ results: [{
        participantId: "p1",
        campaignId: "c1",
        questionVersion: "v3.0",
        answers: { q999: "q999-option-3" },
        elapsedSeconds: 1,
        result: { level: 8, totalScore: 999, maxScore: 999, scorePercent: 100 }
      }] })
    });
    assert.equal(response.status, 400);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(directory, { recursive: true, force: true });
  }
});

test("scopes state reads to the authenticated role", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-assessment-scoped-state-"));
  const dataFile = join(directory, "assessment.json");
  await writeStateFile(dataFile, {
    campaigns: [{ id: "c1", status: "open", questionVersion: "v3.0" }],
    participants: [
      { id: "p1", campaignId: "c1", name: "Alice", token: "invite-p1" },
      { id: "p2", campaignId: "c1", name: "Bob", token: "invite-p2" }
    ],
    drafts: { p1: { answers: { q1: "secret" } }, p2: { answers: { q2: "secret" } } },
    results: [{ participantId: "p2", campaignId: "c1", answers: { q2: "secret" } }],
    questionBank: { version: "v3.0", markdown: "secret bank", updatedAt: "2026-08-04T00:00:00.000Z" }
  });
  const server = startServer({ port: 0, host: "127.0.0.1", dataFile, adminPassword: "scope-password" });
  try {
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address === "object");
    let response = await fetch(`http://127.0.0.1:${address.port}/api/state`);
    let state = await response.json();
    assert.equal(state.participants[0].token, undefined);
    assert.deepEqual(state.drafts, {});
    assert.deepEqual(state.results, []);
    assert.equal(state.questionBank, undefined);

    response = await fetch(`http://127.0.0.1:${address.port}/api/participant/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invite-p1", name: "Alice" })
    });
    const participantCookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    response = await fetch(`http://127.0.0.1:${address.port}/api/state`, { headers: { Cookie: participantCookie } });
    state = await response.json();
    assert.deepEqual(state.participants.map((participant) => participant.id), ["p1"]);
    assert.equal(state.participants[0].token, "invite-p1");
    assert.deepEqual(Object.keys(state.drafts), ["p1"]);
    assert.deepEqual(state.results, []);
    assert.equal(state.questionBank.version, "v3.0");

    response = await fetch(`http://127.0.0.1:${address.port}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "scope-password" })
    });
    const adminCookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    response = await fetch(`http://127.0.0.1:${address.port}/api/state`, { headers: { Cookie: adminCookie } });
    state = await response.json();
    assert.equal(state.participants.length, 2);
    assert.equal(state.participants[1].token, "invite-p2");
    assert.equal(state.results.length, 1);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(directory, { recursive: true, force: true });
  }
});
