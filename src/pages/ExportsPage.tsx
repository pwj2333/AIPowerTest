import { Download, FileSpreadsheet, FileText, UsersRound } from "lucide-react";
import { useState } from "react";
import { buildDepartmentSummaryCsv, buildResultsCsv, buildRosterCsv } from "../domain/exports";
import { assessmentRepository } from "../domain/store";

function downloadCsv(name: string, content: string) {
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ExportsPage() {
  const [campaigns] = useState(() => assessmentRepository.listCampaigns());
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const campaign = campaigns.find((item) => item.id === campaignId);
  const participants = campaign ? assessmentRepository.listParticipants(campaign.id) : [];
  const results = campaign ? assessmentRepository.listResults(campaign.id) : [];
  const filePrefix = campaign?.name ?? "assessment";
  return <div className="admin-page">
    <div className="page-title-row"><div><span className="section-kicker">EXPORTS</span><h1>数据导出</h1><p>选择测评批次后，导出人员名单、个人结果明细或部门汇总。</p></div></div>
    <div className="admin-panel export-selector"><label className="field-label" htmlFor="exports-campaign-select">导出批次</label><select id="exports-campaign-select" aria-label="导出测评批次" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}><option value="">请选择批次</option>{campaigns.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
    {!campaigns.length ? <div className="table-empty">还没有测评批次</div> : !campaign ? <div className="table-empty">请选择要导出的测评批次</div> : <div className="export-grid"><article className="export-card"><div className="export-icon"><UsersRound size={22} /></div><div><h2>人员名单</h2><p>姓名、部门、岗位、完成状态和完成时间。</p></div><button className="button button-primary" type="button" onClick={() => downloadCsv(`${filePrefix}-人员.csv`, buildRosterCsv(participants, results))} disabled={!participants.length}><Download size={16} /> 导出人员 CSV</button></article><article className="export-card"><div className="export-icon export-icon-gold"><FileText size={22} /></div><div><h2>个人结果明细</h2><p>姓名、部门、岗位、等级、置信度、得分和完成时间。</p></div><button className="button button-primary" type="button" onClick={() => downloadCsv(`${filePrefix}-结果.csv`, buildResultsCsv(participants, results))} disabled={!results.length}><Download size={16} /> 导出个人结果 CSV</button></article><article className="export-card"><div className="export-icon export-icon-gold"><FileSpreadsheet size={22} /></div><div><h2>部门能力汇总</h2><p>总人数、完成数和部门平均等级，便于横向比较。</p></div><button className="button button-primary" type="button" onClick={() => downloadCsv(`${filePrefix}-部门汇总.csv`, buildDepartmentSummaryCsv(participants, results))} disabled={!participants.length}><Download size={16} /> 导出部门汇总 CSV</button></article></div>}
  </div>;
}
