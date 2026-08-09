import { describe, expect, it } from "vitest";
import type { Participant, RosterPerson, StoredResult } from "./store";
import { buildDepartmentSummaryCsv, buildResultsCsv, buildRosterCsv, buildRosterDirectoryCsv, parseRosterDirectoryCsv, toCsv } from "./exports";
import { getGrade } from "./questions";

const alice: Participant = {
  id: "p1",
  campaignId: "c1",
  name: "Alice",
  department: "Sales",
  position: "Lead",
  token: "invite-1",
  completedAt: "2026-08-04T08:00:00.000Z"
};

const bob: Participant = {
  id: "p2",
  campaignId: "c1",
  name: "Bob",
  department: "Sales",
  position: "Rep",
  token: "invite-2"
};

const directory: RosterPerson[] = [
  { id: "r1", name: "Alice", department: "Sales", position: "Lead" },
  { id: "r2", name: "Bob", department: "Sales", position: "Rep" }
];

const aliceResult: StoredResult = {
  participantId: "p1",
  campaignId: "c1",
  answers: {},
  elapsedSeconds: 60,
  result: {
    level: 3,
    grade: { level: 3, code: "L3", name: "Level 3", capability: "capability", color: "#000", tasks: [] },
    totalScore: 30,
    maxScore: 60,
    scorePercent: 50,
    levelAverages: {},
    dimensionScores: { office: 1, scenario: 1, workflow: 1, innovation: 1 },
    weakDimensions: ["office"],
    confidence: "high",
    reviewRequired: false,
    completedAt: "2026-08-04T08:00:00.000Z"
  }
};

describe("csv exports", () => {
  it("escapes commas, quotes, newlines, and empty values", () => {
    expect(toCsv([["Name", "Notes"], ["Alice, Inc.", "said \"hello\"\nnext"], [null, undefined]])).toBe(
      '"Name","Notes"\r\n"Alice, Inc.","said ""hello""\nnext"\r\n"",""',
    );
  });

  it("builds roster, result, and department summary exports", () => {
    expect(buildRosterCsv([alice, bob], [aliceResult])).toContain('"Alice","Sales","Lead","已完成"');
    expect(buildRosterCsv([alice, bob], [aliceResult])).toContain('"Bob","Sales","Rep","待开始"');
    expect(buildResultsCsv([alice, bob], [aliceResult])).toContain(`"Alice","Sales","Lead","L3","${getGrade(3).name}","高"`);
    expect(buildDepartmentSummaryCsv([alice, bob], [aliceResult])).toContain('"Sales","2","1","3.0"');
  });

  it("builds a reusable roster directory without campaign fields", () => {
    expect(buildRosterDirectoryCsv(directory)).toBe(
      '"姓名","部门","岗位"\r\n"Alice","Sales","Lead"\r\n"Bob","Sales","Rep"',
    );
  });

  it("round-trips an exported roster directory through CSV parsing", () => {
    const source: RosterPerson[] = [{
      id: "r3",
      name: "Alice, Jr.",
      department: "Sales \"East\"",
      position: "Lead\nPartner"
    }];

    expect(parseRosterDirectoryCsv(buildRosterDirectoryCsv(source))).toEqual([
      { name: "Alice, Jr.", department: "Sales \"East\"", position: "Lead\nPartner" }
    ]);
  });
});
