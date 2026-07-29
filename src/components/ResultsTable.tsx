import { ArrowUpRight, ShieldAlert } from "lucide-react";
import type { Participant, StoredResult } from "../domain/store";
import { getGrade } from "../domain/questions";

interface ResultsTableProps {
  participants: Participant[];
  results: StoredResult[];
  onSelect?: (participant: Participant) => void;
}

export default function ResultsTable({ participants, results, onSelect }: ResultsTableProps) {
  const rows = participants.map((participant) => ({ participant, record: results.find((item) => item.participantId === participant.id) })).filter(({ record }) => record);
  if (rows.length === 0) return <div className="table-empty">暂无已完成的测评结果</div>;
  return <div className="results-table-wrap"><table className="results-table"><thead><tr><th>员工</th><th>部门 / 岗位</th><th>当前等级</th><th>置信度</th><th>完成时间</th><th aria-label="操作" /></tr></thead><tbody>{rows.map(({ participant, record }) => { const grade = getGrade(record!.result.level); return <tr key={participant.id}><td><strong>{participant.name}</strong></td><td>{participant.department}<span className="muted-cell">{participant.position}</span></td><td><span className="level-pill" style={{ "--pill-color": grade.color } as React.CSSProperties}>{grade.code} {grade.name.replace("级", "")}</span></td><td>{record!.result.confidence === "low" ? <span className="review-cell"><ShieldAlert size={14} /> 待复核</span> : <span className="confidence-cell">高</span>}</td><td>{new Date(record!.result.completedAt).toLocaleDateString("zh-CN")}</td><td><button className="icon-button" title="查看个人结果" onClick={() => onSelect?.(participant)}><ArrowUpRight size={16} /></button></td></tr>; })}</tbody></table></div>;
}
