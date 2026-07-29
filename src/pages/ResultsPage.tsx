import { Filter, Search, ShieldAlert, X } from "lucide-react";
import { useMemo, useState } from "react";
import ResultsTable from "../components/ResultsTable";
import { getGrade } from "../domain/questions";
import { assessmentRepository } from "../domain/store";

export default function ResultsPage() {
  const campaign = assessmentRepository.listCampaigns()[0];
  const participants = campaign ? assessmentRepository.listParticipants(campaign.id) : [];
  const results = campaign ? assessmentRepository.listResults(campaign.id) : [];
  const [department, setDepartment] = useState("全部部门");
  const [level, setLevel] = useState("全部等级");
  const [query, setQuery] = useState("");
  const departments = [...new Set(participants.map((person) => person.department))];
  const filteredParticipants = useMemo(() => participants.filter((person) => { const result = results.find((item) => item.participantId === person.id); const matchesDepartment = department === "全部部门" || person.department === department; const matchesLevel = level === "全部等级" || result?.result.level === Number(level); const matchesQuery = !query.trim() || `${person.name}${person.position}`.includes(query.trim()); return matchesDepartment && matchesLevel && matchesQuery && result; }), [department, level, participants, query, results]);
  const filteredResults = results.filter((item) => filteredParticipants.some((person) => person.id === item.participantId));
  return <div className="admin-page"><div className="page-title-row"><div><span className="section-kicker">RESULTS</span><h1>结果明细</h1><p>按组织维度、等级和置信度筛选已完成的测评。</p></div><span className="result-count"><strong>{filteredResults.length}</strong> / {results.length} 条结果</span></div><div className="filter-bar"><label className="search-field"><Search size={16} /><input aria-label="搜索员工" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名或岗位" /></label><label className="filter-select"><Filter size={15} /><select value={department} onChange={(event) => setDepartment(event.target.value)}><option>全部部门</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label><label className="filter-select"><select value={level} onChange={(event) => setLevel(event.target.value)}><option>全部等级</option>{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>L{index + 1} {getGrade(index + 1).name.replace("级", "")}</option>)}</select></label>{(department !== "全部部门" || level !== "全部等级" || query) && <button className="clear-filter" type="button" onClick={() => { setDepartment("全部部门"); setLevel("全部等级"); setQuery(""); }}><X size={14} /> 清除筛选</button>}</div><article className="admin-panel results-panel"><div className="panel-heading"><div><span className="section-kicker">{campaign?.name ?? "暂无测评批次"}</span><h2>已完成结果</h2></div><span className="review-summary"><ShieldAlert size={15} /> {filteredResults.filter((item) => item.result.confidence === "low" || item.result.reviewRequired).length} 条需关注</span></div><ResultsTable participants={filteredParticipants} results={filteredResults} /></article></div>;
}
