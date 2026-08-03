import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { once } from "node:events";
import { join } from "node:path";
import test from "node:test";
import { mergeStatePatch, readStateFile, startServer, writeStateFile } from "./server.mjs";

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

  assert.deepEqual(next, { campaigns: [], participants: [], drafts: {}, results: [] });
});

test("requires admin authentication for removal patches", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-assessment-remove-api-"));
  const dataFile = join(directory, "assessment.json");
  await writeStateFile(dataFile, {
    campaigns: [{ id: "c1", name: "remove me" }],
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
