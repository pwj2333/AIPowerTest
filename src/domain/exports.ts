import { getGrade } from "./questions";
import type { Participant, StoredResult } from "./store";

export type CsvValue = string | number | null | undefined;

function csvCell(value: CsvValue): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<CsvValue>>): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function resultFields(record?: StoredResult) {
  const result = record?.result;
  const stages = Array.from({ length: 8 }, (_, index) => {
    const stage = result?.stageResults?.find((item) => item.level === index + 1);
    return stage ? `${stage.totalScore}/${stage.questionCount * 3}` : "";
  });
  return {
    answered: result?.answeredQuestionCount ?? (record ? Object.keys(record.answers).length : ""),
    highest: result ? `L${result.level}` : "",
    stopped: result?.stoppedAtLevel ? `L${result.stoppedAtLevel}` : "",
    stages
  };
}

export function buildRosterCsv(participants: Participant[], results: StoredResult[] = []): string {
  const resultByParticipant = new Map(results.map((record) => [record.participantId, record]));
  return toCsv([
    ["姓名", "部门", "岗位", "状态", "完成时间", "实际答题数", "最高通过等级", "停止关卡", ...Array.from({ length: 8 }, (_, index) => `L${index + 1}得分`)],
    ...participants.map((participant) => {
      const record = resultByParticipant.get(participant.id);
      const fields = resultFields(record);
      return [
        participant.name,
        participant.department,
        participant.position,
        record ? "已完成" : "待开始",
        record?.result.completedAt ?? "",
        fields.answered,
        fields.highest,
        fields.stopped,
        ...fields.stages
      ];
    })
  ]);
}

export function buildResultsCsv(participants: Participant[], results: StoredResult[]): string {
  const peopleById = new Map(participants.map((participant) => [participant.id, participant]));
  return toCsv([
    ["姓名", "部门", "岗位", "等级", "能力等级", "置信度", "完成时间", "总分", "原始得分率", "实际答题数", "最高通过等级", "停止关卡", ...Array.from({ length: 8 }, (_, index) => `L${index + 1}得分`), "AI交互与办公", "场景与价值判断", "流程与工具连接", "应用与组织创新"],
    ...results.flatMap((record) => {
      const participant = peopleById.get(record.participantId);
      if (!participant) return [];
      const fields = resultFields(record);
      const dimensions = [record.result.dimensionScores.office, record.result.dimensionScores.scenario, record.result.dimensionScores.workflow, record.result.dimensionScores.innovation]
        .map((value) => value === null || value === undefined ? "未挑战" : `${value}%`);
      return [[
        participant.name,
        participant.department,
        participant.position,
        getGrade(record.result.level).code,
        getGrade(record.result.level).name,
        record.result.confidence === "high" ? "高" : "待复核",
        record.result.completedAt,
        record.result.totalScore,
        `${record.result.scorePercent}%`,
        fields.answered,
        fields.highest,
        fields.stopped,
        ...fields.stages,
        ...dimensions
      ]];
    })
  ]);
}

export function buildDepartmentSummaryCsv(participants: Participant[], results: StoredResult[]): string {
  const resultByParticipant = new Map(results.map((record) => [record.participantId, record]));
  const departments = [...new Set(participants.map((participant) => participant.department))];
  return toCsv([
    ["部门", "总人数", "已完成", "平均最高通过等级", "完成率", "L1通过率", "L2通过率", "L3通过率", "L4通过率", "L5通过率", "L6通过率", "L7通过率", "L8通过率"],
    ...departments.map((department) => {
      const people = participants.filter((participant) => participant.department === department);
      const completed = people.map((person) => resultByParticipant.get(person.id)).filter((record): record is StoredResult => Boolean(record));
      const passRates = Array.from({ length: 8 }, (_, index) => completed.length
        ? `${Math.round((completed.filter((record) => record.result.level >= index + 1).length / completed.length) * 100)}%`
        : "-");
      const average = completed.length
        ? (completed.reduce((total, record) => total + record.result.level, 0) / completed.length).toFixed(1)
        : "-";
      return [department, people.length, completed.length, average, people.length ? `${Math.round((completed.length / people.length) * 100)}%` : "-", ...passRates];
    })
  ]);
}
