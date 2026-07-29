import { ArrowRight, CheckCircle2, Clock3, Target, TrendingUp, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import LevelDistribution from "../components/LevelDistribution";
import ResultsTable from "../components/ResultsTable";
import { getDimensionLabel } from "../domain/questions";
import { analyzeScoreDistribution } from "../domain/scoring";
import { assessmentRepository } from "../domain/store";
import type { AbilityDimension } from "../domain/types";

const dimensions: AbilityDimension[] = ["office", "scenario", "workflow", "innovation"];

export default function AdminOverviewPage() {
  const campaign = assessmentRepository.listCampaigns()[0];
  const participants = campaign ? assessmentRepository.listParticipants(campaign.id) : [];
  const results = campaign ? assessmentRepository.listResults(campaign.id) : [];
  const completedRate = participants.length ? Math.round((results.length / participants.length) * 100) : 0;
  const averageLevel = results.length ? (results.reduce((sum, item) => sum + item.result.level, 0) / results.length).toFixed(1) : "0.0";
  const dimensionAverages = Object.fromEntries(dimensions.map((dimension) => [dimension, results.length ? Math.round(results.reduce((sum, item) => sum + item.result.dimensionScores[dimension], 0) / results.length) : 0])) as Record<AbilityDimension, number>;
  const weakest = [...dimensions].sort((left, right) => dimensionAverages[left] - dimensionAverages[right]).slice(0, 3);
  const departments = [...new Set(participants.map((participant) => participant.department))].map((department) => {
    const people = participants.filter((participant) => participant.department === department);
    const departmentResults = results.filter((result) => people.some((person) => person.id === result.participantId));
    return { department, average: departmentResults.length ? (departmentResults.reduce((sum, item) => sum + item.result.level, 0) / departmentResults.length).toFixed(1) : "-", count: departmentResults.length, total: people.length };
  });
  const scorePercentages = results.map((item) => {
    if (typeof item.result.scorePercent === "number") return item.result.scorePercent;
    const scores = Object.values(item.answers).map((optionId) => Number(optionId.split("-").at(-1))).filter(Number.isFinite);
    return scores.length ? Math.round((scores.reduce((total, score) => total + score, 0) / (scores.length * 3)) * 100) : 0;
  });
  const distribution = analyzeScoreDistribution(scorePercentages);

  return <div className="admin-page"><div className="page-title-row"><div><span className="section-kicker">{campaign?.name ?? "OVERVIEW"}</span><h1>AI 能力测评</h1><p>从参测进度到能力短板，快速定位下一轮培训重点。</p></div><Link className="button button-primary" to={campaign ? "/admin/people" : "/admin/campaigns"}><UsersRound size={17} /> {campaign ? "管理人员名单" : "创建测评批次"}</Link></div><div className="metric-grid"><Metric icon={<TrendingUp size={18} />} label="参测率" value={`${completedRate}%`} note={`${results.length} / ${participants.length} 人已完成`} /><Metric icon={<Target size={18} />} label="平均能力等级" value={`L${averageLevel}`} note="以已完成结果计算" accent /><Metric icon={<Clock3 size={18} />} label="待完成测评" value={`${participants.length - results.length} 人`} note="可从人员名单发送提醒" /><Metric icon={<CheckCircle2 size={18} />} label="高等级待复核" value={`${results.filter((item) => item.result.reviewRequired || item.result.confidence === "low").length} 人`} note="L6+ 或低置信度结果" /></div><div className="admin-grid-two"><article className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">LEVEL DISTRIBUTION</span><h2>等级分布</h2></div><Link className="panel-link" to="/admin/results">查看明细 <ArrowRight size={14} /></Link></div><LevelDistribution results={results} /></article><article className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">PRIORITY GAPS</span><h2>优先补强能力</h2></div><span className="panel-caption">平均表现</span></div><div className="priority-list">{weakest.map((dimension, index) => <div className="priority-item" key={dimension}><span className="priority-rank">0{index + 1}</span><div><strong>{getDimensionLabel(dimension)}</strong><span>{dimensionAverages[dimension]}% 平均完成度</span></div><div className="priority-meter"><span style={{ width: `${dimensionAverages[dimension]}%` }} /></div></div>)}</div></article></div><DistributionPanel distribution={distribution} /><article className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">DEPARTMENT COMPARISON</span><h2>部门平均等级</h2></div><Link className="panel-link" to="/admin/results">按部门筛选 <ArrowRight size={14} /></Link></div><div className="department-grid">{departments.map((item) => <div className="department-item" key={item.department}><div className="department-top"><strong>{item.department}</strong><span>{item.average === "-" ? "待完成" : `L${item.average}`}</span></div><div className="department-track"><span style={{ width: `${item.average === "-" ? 0 : (Number(item.average) / 8) * 100}%` }} /></div><small>{item.count} / {item.total} 人完成</small></div>)}</div></article><article className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">LATEST RESULTS</span><h2>最近完成</h2></div><Link className="panel-link" to="/admin/results">全部结果 <ArrowRight size={14} /></Link></div><ResultsTable participants={participants} results={results.slice(-5).reverse()} /></article></div>;
}

function DistributionPanel({ distribution }: { distribution: ReturnType<typeof analyzeScoreDistribution> }) {
  const labels = ["0–19", "20–39", "40–59", "60–79", "80–100"];
  const max = Math.max(...distribution.bins, 1);
  const messages = {
    insufficient: `还需 ${Math.max(0, 30 - distribution.sampleSize)} 份有效答卷后评估形态`,
    concentrated: "分数过度集中，需要检查题目区分度",
    skewed: "分布存在明显偏态，需要复核题目与样本",
    "approximately-normal": "当前样本近似钟形，仍需持续复核"
  };
  return <article className="admin-panel score-distribution-panel"><div className="panel-heading"><div><span className="section-kicker">SCORE CALIBRATION</span><h2>原始分分布诊断</h2></div><span className={`distribution-status status-${distribution.status}`}>{distribution.status === "approximately-normal" ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}{messages[distribution.status]}</span></div><div className="score-distribution-body"><div className="score-histogram">{distribution.bins.map((count, index) => <div className="score-bin" key={labels[index]}><strong>{count}</strong><div><span style={{ height: `${Math.max(4, (count / max) * 100)}%` }} /></div><small>{labels[index]}</small></div>)}</div><dl className="distribution-stats"><div><dt>有效样本</dt><dd>{distribution.sampleSize}</dd></div><div><dt>平均分</dt><dd>{distribution.mean}</dd></div><div><dt>标准差</dt><dd>{distribution.standardDeviation}</dd></div><div><dt>偏度</dt><dd>{distribution.skewness}</dd></div><div><dt>JB 值</dt><dd>{distribution.jarqueBera}</dd></div></dl></div></article>;
}

function Metric({ icon, label, value, note, accent = false }: { icon: React.ReactNode; label: string; value: string; note: string; accent?: boolean }) {
  return <article className={`metric-card ${accent ? "metric-card-accent" : ""}`}><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
