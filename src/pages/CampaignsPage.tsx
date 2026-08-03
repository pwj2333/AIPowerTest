import { Archive, ChevronRight, CirclePlus, Eye, EyeOff, PauseCircle, PlayCircle, RotateCcw, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { assessmentRepository, type CampaignStatus } from "../domain/store";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState(() => assessmentRepository.listCampaigns());
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const refresh = () => setCampaigns(assessmentRepository.listCampaigns());
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setError("");
    assessmentRepository.createCampaign({ name });
    try {
      await assessmentRepository.flush();
      refresh();
      setName("");
      setMessage("已创建新的测评批次");
    } catch {
      await assessmentRepository.initialize().catch(() => undefined);
      refresh();
      setError("批次保存失败，请稍后重试。");
    }
  };

  const updateStatus = async (id: string, status: CampaignStatus) => {
    setError("");
    assessmentRepository.setCampaignStatus(id, status);
    try {
      await assessmentRepository.flush();
      setMessage(status === "archived" ? "批次已归档，可随时恢复" : "批次已恢复开放");
    } catch {
      await assessmentRepository.initialize().catch(() => undefined);
      setError("批次状态保存失败，请稍后重试。");
    }
    refresh();
  };

  const deleteCampaign = async (id: string) => {
    if (!window.confirm("永久删除该批次？批次内的人员、草稿和结果都会被删除，且无法恢复。")) return;
    setError("");
    assessmentRepository.deleteCampaign(id);
    try {
      await assessmentRepository.flush();
      setMessage("批次已永久删除");
    } catch {
      await assessmentRepository.initialize().catch(() => undefined);
      setError("批次删除保存失败，请稍后重试。");
    }
    refresh();
  };

  const visibleCampaigns = campaigns.filter((campaign) => showArchived || campaign.status !== "archived");
  return <div className="admin-page">
    <div className="page-title-row"><div><span className="section-kicker">CAMPAIGNS</span><h1>测评批次</h1><p>每个批次固定题库版本，归档用于隐藏历史批次，永久删除前会明确提示影响范围。</p></div><form className="inline-create-form" onSubmit={create}><input aria-label="新批次名称" value={name} onChange={(event) => setName(event.target.value)} placeholder="新批次名称" /><button className="button button-primary" type="submit"><CirclePlus size={17} /> 创建批次</button></form></div>
    <div className="page-actions"><button className="button" type="button" onClick={() => setShowArchived((value) => !value)}>{showArchived ? <EyeOff size={16} /> : <Eye size={16} />} {showArchived ? "隐藏已归档" : "显示已归档"}</button></div>
    {message && <p className="success-message" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!campaigns.length ? <div className="table-empty">还没有测评批次</div> : !visibleCampaigns.length ? <div className="table-empty">暂无进行中的批次</div> : <div className="campaign-list">{visibleCampaigns.map((campaign) => { const people = assessmentRepository.listParticipants(campaign.id); const results = assessmentRepository.listResults(campaign.id); return <article className="campaign-card" key={campaign.id}><div className="campaign-card-main"><div className="campaign-icon"><Archive size={21} /></div><div><div className="campaign-title-line"><h2>{campaign.name}</h2><StatusBadge status={campaign.status} /></div><p>题库 {campaign.questionVersion} · 创建于 {new Date(campaign.createdAt).toLocaleDateString("zh-CN")}</p><div className="campaign-progress"><span>完成 {results.length} / {people.length} 人</span><div className="progress-track"><span style={{ width: `${people.length ? (results.length / people.length) * 100 : 0}%` }} /></div></div></div></div><div className="campaign-actions">{campaign.status !== "archived" && <button className="icon-button" title={campaign.status === "open" ? "关闭批次" : "重新开放"} onClick={() => updateStatus(campaign.id, campaign.status === "open" ? "closed" : "open")}>{campaign.status === "open" ? <PauseCircle size={17} /> : <PlayCircle size={17} />}</button>}{campaign.status === "archived" ? <button className="icon-button" title="恢复批次" onClick={() => updateStatus(campaign.id, "open")}><RotateCcw size={17} /></button> : <button className="icon-button" title="归档批次" onClick={() => updateStatus(campaign.id, "archived")}><Archive size={17} /></button>}<button className="icon-button" title="永久删除批次" onClick={() => deleteCampaign(campaign.id)}><Trash2 size={17} /></button><ChevronRight size={17} className="muted-icon" /></div></article>; })}</div>}
  </div>;
}

function StatusBadge({ status }: { status: CampaignStatus }) { const labels: Record<CampaignStatus, string> = { open: "进行中", draft: "草稿", closed: "已关闭", archived: "已归档" }; return <span className={`status-badge status-${status}`}>{labels[status]}</span>; }
