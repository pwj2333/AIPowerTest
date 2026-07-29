import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { assessmentRepository } from "../domain/store";

function download(name: string, content: string) { const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url); }

export default function ExportsPage() {
  const campaign = assessmentRepository.seedDemoData();
  const participants = assessmentRepository.listParticipants(campaign.id);
  const results = assessmentRepository.listResults(campaign.id);
  const exportDetails = () => download("ai-capability-results.csv", ["姓名,部门,岗位,等级,置信度,完成时间", ...results.map((item) => { const person = participants.find((participant) => participant.id === item.participantId)!; return [person.name, person.department, person.position, `L${item.result.level}`, item.result.confidence === "high" ? "高" : "低", item.result.completedAt].map((value) => `"${value}"`).join(","); })].join("\n"));
  const exportSummary = () => { const grouped = [...new Set(participants.map((participant) => participant.department))].map((department) => { const people = participants.filter((participant) => participant.department === department); const group = results.filter((item) => people.some((person) => person.id === item.participantId)); const average = group.length ? (group.reduce((sum, item) => sum + item.result.level, 0) / group.length).toFixed(1) : "-"; return `"${department}","${people.length}","${group.length}","${average}"`; }); download("ai-capability-department-summary.csv", ["部门,总人数,已完成,平均等级", ...grouped].join("\n")); };
  return <div className="admin-page"><div className="page-title-row"><div><span className="section-kicker">EXPORTS</span><h1>数据导出</h1><p>导出当前批次的个人明细或部门汇总，用于培训诊断和复测对比。</p></div></div><div className="export-grid"><article className="export-card"><div className="export-icon"><FileText size={22} /></div><div><h2>个人结果明细</h2><p>姓名、部门、岗位、等级、置信度和完成时间。</p></div><button className="button button-primary" type="button" onClick={exportDetails}><Download size={16} /> 导出 CSV</button></article><article className="export-card"><div className="export-icon export-icon-gold"><FileSpreadsheet size={22} /></div><div><h2>部门能力汇总</h2><p>总人数、完成数和部门平均等级，便于横向比较。</p></div><button className="button button-primary" type="button" onClick={exportSummary}><Download size={16} /> 导出 CSV</button></article></div></div>;
}
