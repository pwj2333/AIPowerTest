import { ArrowRight, CheckCircle2, Clock3, Target, TrendingUp, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import LevelDistribution from "../components/LevelDistribution";
import ResultsTable from "../components/ResultsTable";
import { getDimensionLabel, getGrade } from "../domain/questions";
import { assessmentRepository, type StoredResult } from "../domain/store";
import type { AbilityDimension } from "../domain/types";

const dimensions: AbilityDimension[] = ["office", "scenario", "workflow", "innovation"];

export default function AdminOverviewPage() {
  const campaign = assessmentRepository.listCampaigns()[0];
  const participants = campaign ? assessmentRepository.listParticipants(campaign.id) : [];
  const results = campaign ? assessmentRepository.listResults(campaign.id) : [];
  const completedRate = participants.length ? Math.round((results.length / participants.length) * 100) : 0;
  const averageLevel = results.length ? (results.reduce((sum, item) => sum + item.result.level, 0) / results.length).toFixed(1) : "0.0";
  const dimensionAverages = Object.fromEntries(dimensions.map((dimension) => {
    const values = results.map((item) => item.result.dimensionScores[dimension]).filter((value): value is number => value !== null && value !== undefined);
    return [dimension, values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null];
  })) as Record<AbilityDimension, number | null>;
  const weakest = dimensions.filter((dimension) => dimensionAverages[dimension] !== null)
    .sort((left, right) => dimensionAverages[left]! - dimensionAverages[right]!).slice(0, 3);
  const departments = [...new Set(participants.map((participant) => participant.department))].map((department) => {
    const people = participants.filter((participant) => participant.department === department);
    const departmentResults = results.filter((result) => people.some((person) => person.id === result.participantId));
    return { department, average: departmentResults.length ? (departmentResults.reduce((sum, item) => sum + item.result.level, 0) / departmentResults.length).toFixed(1) : "-", count: departmentResults.length, total: people.length };
  });

  return <div className="admin-page"><div className="page-title-row"><div><span className="section-kicker">{campaign?.name ?? "OVERVIEW"}</span><h1>AI 能力测评</h1><p>查看测评进度、等级分布和各关通过率，定位下一轮培训重点。</p></div><Link className="button button-primary" to={campaign ? "/admin/people" : "/admin/campaigns"}><UsersRound size={17} /> {campaign ? "管理人员名单" : "创建测评批次"}</Link></div><div className="metric-grid"><Metric icon={<TrendingUp size={18} />} label="参与率" value={`${completedRate}%`} note={`${results.length} / ${participants.length} 人已完成`} /><Metric icon={<Target size={18} />} label="平均最高等级" value={`L${averageLevel}`} note="按已完成结果计算" accent /><Metric icon={<Clock3 size={18} />} label="待完成测评" value={`${participants.length - results.length} 人`} note="可从人员名单发送提醒" /><Metric icon={<CheckCircle2 size={18} />} label="需要复核" value={`${results.filter((item) => item.result.reviewRequired || item.result.confidence === "low").length} 人`} note="L6+ 或低置信度结果" /></div><div className="admin-grid-two"><article className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">LEVEL DISTRIBUTION</span><h2>等级分布</h2></div><Link className="panel-link" to="/admin/results">查看明细 <ArrowRight size={14} /></Link></div><LevelDistribution results={results} /></article><article className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">PRIORITY GAPS</span><h2>优先补强能力</h2></div><span className="panel-caption">未挑战不计入平均</span></div><div className="priority-list">{weakest.map((dimension, index) => { const value = dimensionAverages[dimension]; return <div className="priority-item" key={dimension}><span className="priority-rank">0{index + 1}</span><div><strong>{getDimensionLabel(dimension)}</strong><span>{value === null ? "未挑战" : `${value}%`}</span></div><div className="priority-meter"><span style={{ width: `${value ?? 0}%` }} /></div></div>; })}</div></article></div><StagePassRatePanel results={results} /><article className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">DEPARTMENT COMPARISON</span><h2>部门等级概览</h2></div><Link className="panel-link" to="/admin/results">按部门筛选 <ArrowRight size={14} /></Link></div><div className="department-grid">{departments.map((item) => <div className="department-item" key={item.department}><div className="department-top"><strong>{item.department}</strong><span>{item.average === "-" ? "待完成" : `L${item.average}`}</span></div><div className="department-track"><span style={{ width: `${item.average === "-" ? 0 : (Number(item.average) / 8) * 100}%` }} /></div><small>{item.count} / {item.total} 人完成</small></div>)}</div></article><article className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">LATEST RESULTS</span><h2>最近完成</h2></div><Link className="panel-link" to="/admin/results">全部结果 <ArrowRight size={14} /></Link></div><ResultsTable participants={participants} results={results.slice(-5).reverse()} /></article></div>;
}

function StagePassRatePanel({ results }: { results: StoredResult[] }) {
  return <article className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">STAGE PASS RATES</span><h2>逐关通过率</h2></div><span className="panel-caption">只比较同一关卡</span></div><div className="stage-pass-list">{Array.from({ length: 8 }, (_, index) => { const level = index + 1; const attempted = results.filter((item) => item.result.stageResults?.some((stage) => stage.level === level)); const passed = attempted.filter((item) => item.result.stageResults?.find((stage) => stage.level === level)?.status === "passed"); const rate = attempted.length ? Math.round((passed.length / attempted.length) * 100) : 0; return <div className="stage-pass-row" key={level}><span>L{level} · {getGrade(level).name}</span><div className="progress-track"><span style={{ width: `${rate}%` }} /></div><strong>{attempted.length ? `${rate}%` : "-"}</strong><small>{attempted.length} 人</small></div>; })}</div></article>;
}

function Metric({ icon, label, value, note, accent = false }: { icon: React.ReactNode; label: string; value: string; note: string; accent?: boolean }) {
  return <article className={`metric-card ${accent ? "metric-card-accent" : ""}`}><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
