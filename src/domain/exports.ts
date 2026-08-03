import type { Participant, StoredResult } from "./store";

export type CsvValue = string | number | null | undefined;

function csvCell(value: CsvValue): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<CsvValue>>): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function buildRosterCsv(participants: Participant[], results: StoredResult[] = []): string {
  const resultByParticipant = new Map(results.map((record) => [record.participantId, record]));
  return toCsv([
    ["姓名", "部门", "岗位", "状态", "完成时间"],
    ...participants.map((participant) => {
      const record = resultByParticipant.get(participant.id);
      return [
        participant.name,
        participant.department,
        participant.position,
        record ? "已完成" : "待开始",
        record?.result.completedAt ?? ""
      ];
    })
  ]);
}

export function buildResultsCsv(participants: Participant[], results: StoredResult[]): string {
  const peopleById = new Map(participants.map((participant) => [participant.id, participant]));
  return toCsv([
    ["姓名", "部门", "岗位", "等级", "能力等级", "置信度", "完成时间", "总分", "得分率"],
    ...results.flatMap((record) => {
      const participant = peopleById.get(record.participantId);
      if (!participant) return [];
      return [[
        participant.name,
        participant.department,
        participant.position,
        record.result.grade.code,
        record.result.grade.name,
        record.result.confidence === "high" ? "高" : "待复核",
        record.result.completedAt,
        record.result.totalScore,
        `${record.result.scorePercent}%`
      ]];
    })
  ]);
}

export function buildDepartmentSummaryCsv(participants: Participant[], results: StoredResult[]): string {
  const resultByParticipant = new Map(results.map((record) => [record.participantId, record]));
  const departments = [...new Set(participants.map((participant) => participant.department))];
  return toCsv([
    ["部门", "总人数", "已完成", "平均等级"],
    ...departments.map((department) => {
      const people = participants.filter((participant) => participant.department === department);
      const completed = people.map((person) => resultByParticipant.get(person.id)).filter((record): record is StoredResult => Boolean(record));
      const average = completed.length
        ? (completed.reduce((total, record) => total + record.result.level, 0) / completed.length).toFixed(1)
        : "-";
      return [department, people.length, completed.length, average];
    })
  ]);
}
