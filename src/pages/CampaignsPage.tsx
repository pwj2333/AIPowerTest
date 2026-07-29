import { Archive, ChevronRight, CirclePlus, PauseCircle, PlayCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { assessmentRepository, type CampaignStatus } from "../domain/store";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState(() => { assessmentRepository.seedDemoData(); return assessmentRepository.listCampaigns(); });
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const create = (event: FormEvent) => { event.preventDefault(); if (!name.trim()) return; assessmentRepository.createCampaign({ name }); setCampaigns(assessmentRepository.listCampaigns()); setName(""); setMessage("已创建新的测评批次"); };
  const updateStatus = (id: string, status: CampaignStatus) => { assessmentRepository.setCampaignStatus(id, status); setCampaigns(assessmentRepository.listCampaigns()); };
  return <div className="admin-page"><div className="page-title-row"><div><span className="section-kicker">CAMPAIGNS</span><h1>测评批次</h1><p>每个批次固定题库版本，复测结果不会覆盖历史记录。</p></div><form className="inline-create-form" onSubmit={create}><input aria-label="新批次名称" value={name} onChange={(event) => setName(event.target.value)} placeholder="新批次名称" /><button className="button button-primary" type="submit"><CirclePlus size={17} /> 创建批次</button></form></div>{message && <p className="success-message" role="status">{message}</p>}<div className="campaign-list">{campaigns.map((campaign) => { const people = assessmentRepository.listParticipants(campaign.id); const results = assessmentRepository.listResults(campaign.id); return <article className="campaign-card" key={campaign.id}><div className="campaign-card-main"><div className="campaign-icon"><ClipboardIcon /></div><div><div className="campaign-title-line"><h2>{campaign.name}</h2><StatusBadge status={campaign.status} /></div><p>题库 {campaign.questionVersion} · 创建于 {new Date(campaign.createdAt).toLocaleDateString("zh-CN")}</p><div className="campaign-progress"><span>完成 {results.length} / {people.length} 人</span><div className="progress-track"><span style={{ width: `${people.length ? (results.length / people.length) * 100 : 0}%` }} /></div></div></div></div><div className="campaign-actions"><button className="icon-button" title={campaign.status === "open" ? "关闭批次" : "重新开放"} onClick={() => updateStatus(campaign.id, campaign.status === "open" ? "closed" : "open")}>{campaign.status === "open" ? <PauseCircle size={17} /> : <PlayCircle size={17} />}</button><ChevronRight size={17} className="muted-icon" /></div></article>; })}</div></div>;
}

function StatusBadge({ status }: { status: CampaignStatus }) { const labels: Record<CampaignStatus, string> = { open: "进行中", draft: "草稿", closed: "已关闭", archived: "已归档" }; return <span className={`status-badge status-${status}`}>{labels[status]}</span>; }
function ClipboardIcon() { return <Archive size={21} />; }
