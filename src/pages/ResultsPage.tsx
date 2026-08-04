import { Download, Filter, Search, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import ResultsTable from "../components/ResultsTable";
import { buildResultsCsv } from "../domain/exports";
import { getGrade } from "../domain/questions";
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

export default function ResultsPage() {
  const [campaigns] = useState(() => assessmentRepository.listCampaigns());
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [department, setDepartment] = useState("全部部门");
  const [level, setLevel] = useState("全部等级");
  const [query, setQuery] = useState("");
  const campaign = campaigns.find((item) => item.id === campaignId);
  const participants = campaign ? assessmentRepository.listParticipants(campaign.id) : [];
  const results = campaign ? assessmentRepository.listResults(campaign.id) : [];
  const departments = [...new Set(participants.map((person) => person.department))];
  const filteredParticipants = useMemo(() => participants.filter((person) => {
    const result = results.find((item) => item.participantId === person.id);
    const matchesDepartment = department === "全部部门" || person.department === department;
    const matchesLevel = level === "全部等级" || result?.result.level === Number(level);
    const matchesQuery = !query.trim() || `${person.name}${person.position}`.includes(query.trim());
    return Boolean(result) && matchesDepartment && matchesLevel && matchesQuery;
  }), [department, level, participants, query, results]);
  const filteredResults = results.filter((item) => filteredParticipants.some((person) => person.id === item.participantId));
  const hasFilters = department !== "全部部门" || level !== "全部等级" || Boolean(query);

  return <div className="admin-page">
    <div className="page-title-row"><div><span className="section-kicker">RESULTS</span><h1>结果明细</h1><p>选择批次后，按组织维度、等级和姓名筛选已完成的测评结果。</p></div><span className="result-count"><strong>{filteredResults.length}</strong> / {results.length} 条结果</span></div>
    <div className="filter-bar"><label className="filter-select" htmlFor="results-campaign-select">测评批次<select id="results-campaign-select" aria-label="结果测评批次" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}><option value="">请选择批次</option>{campaigns.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="search-field"><Search size={16} /><input aria-label="搜索员工" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名或岗位" /></label><label className="filter-select"><Filter size={15} /><select aria-label="结果部门" value={department} onChange={(event) => setDepartment(event.target.value)}><option>全部部门</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label><label className="filter-select"><select aria-label="结果等级" value={level} onChange={(event) => setLevel(event.target.value)}><option>全部等级</option>{Array.from({ length: 9 }, (_, index) => <option key={index} value={index}>{getGrade(index).code} {getGrade(index).name.replace("等级", "")}</option>)}</select></label>{hasFilters && <button className="clear-filter" type="button" onClick={() => { setDepartment("全部部门"); setLevel("全部等级"); setQuery(""); }}><X size={14} /> 清除筛选</button>}</div>
    <article className="admin-panel results-panel"><div className="panel-heading"><div><span className="section-kicker">{campaign?.name ?? "暂无测评批次"}</span><h2>已完成结果</h2></div><div className="campaign-actions"><span className="review-summary"><ShieldAlert size={15} /> {filteredResults.filter((item) => item.result.confidence === "low" || item.result.reviewRequired).length} 条需关注</span><button className="button" type="button" onClick={() => downloadCsv(`${campaign?.name ?? "results"}-结果.csv`, buildResultsCsv(filteredParticipants, filteredResults))} disabled={!filteredResults.length}><Download size={16} /> 导出筛选结果 CSV</button></div></div>{!campaigns.length ? <div className="table-empty">还没有测评批次</div> : !campaign ? <div className="table-empty">请选择要查看的测评批次</div> : <ResultsTable participants={filteredParticipants} results={filteredResults} />}</article>
  </div>;
}
