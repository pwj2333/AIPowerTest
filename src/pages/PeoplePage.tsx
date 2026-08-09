import { CheckCircle2, Download, FileUp, UploadCloud, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { buildRosterDirectoryCsv } from "../domain/exports";
import { assessmentRepository, type RosterRow } from "../domain/store";

function parseCsv(value: string): RosterRow[] {
  return value.trim().split(/\r?\n/).filter(Boolean).slice(value.includes("姓名") ? 1 : 0).map((line) => {
    const [name = "", department = "", position = ""] = line.split(",");
    return { name, department, position };
  });
}

function downloadCsv(name: string, content: string) {
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PeoplePage() {
  const [campaigns, setCampaigns] = useState(() => assessmentRepository.listCampaigns());
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [csv, setCsv] = useState("");
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const roster = useMemo(() => assessmentRepository.listRoster(), [refreshKey]);
  const participants = useMemo(() => assessmentRepository.listParticipants(campaignId), [campaignId, refreshKey]);
  const campaign = campaigns.find((item) => item.id === campaignId);
  const enrolledRosterIds = useMemo(() => new Set(participants.map((participant) => participant.rosterId)), [participants]);

  const reload = () => {
    const nextCampaigns = assessmentRepository.listCampaigns();
    setCampaigns(nextCampaigns);
    setCampaignId((current) => nextCampaigns.some((item) => item.id === current) ? current : nextCampaigns[0]?.id ?? "");
    setRefreshKey((value) => value + 1);
  };

  const importRoster = async () => {
    setSaveError("");
    const report = assessmentRepository.importRoster(parseCsv(csv));
    try {
      await assessmentRepository.flush();
      setMessage(`成功导入 ${report.imported.length} 人`);
      setErrors(report.errors);
      setCsv("");
      reload();
    } catch {
      await assessmentRepository.initialize().catch(() => undefined);
      reload();
      setSaveError("花名册保存失败，请稍后重试。");
    }
  };

  const syncRoster = async () => {
    if (!campaignId) return;
    setSaveError("");
    const added = assessmentRepository.syncRosterToCampaign(campaignId);
    try {
      await assessmentRepository.flush();
      setMessage(added.length ? `已同步 ${added.length} 人到 ${campaign?.name ?? "当前批次"}` : "该批次已包含全部花名册人员。");
      reload();
    } catch {
      await assessmentRepository.initialize().catch(() => undefined);
      reload();
      setSaveError("批次成员保存失败，请稍后重试。");
    }
  };

  const setEnrollment = async (rosterId: string, enrolled: boolean) => {
    if (!campaignId) return;
    setSaveError("");
    try {
      assessmentRepository.setRosterEnrollment(campaignId, rosterId, enrolled);
      await assessmentRepository.flush();
      setMessage(enrolled ? "已加入批次成员。" : "已从当前批次移出。");
      reload();
    } catch (error) {
      await assessmentRepository.initialize().catch(() => undefined);
      reload();
      setSaveError(error instanceof Error ? error.message : "批次成员保存失败，请稍后重试。");
    }
  };

  return <div className="admin-page">
    <div className="page-title-row">
      <div><span className="section-kicker">PEOPLE</span><h1>人员名单</h1><p>花名册只需导入一次；新建批次会默认纳入全部人员，也可按批次排除少数不参与的人员。</p></div>
    </div>
    <section className="import-layout">
      <article className="admin-panel import-panel">
        <div className="panel-heading"><div><span className="section-kicker">GLOBAL ROSTER</span><h2>导入全局花名册 <span className="heading-count">{roster.length}</span></h2></div><FileUp size={20} className="heading-icon" /></div>
        <label className="field-label" htmlFor="csv-input">CSV 人员数据</label>
        <textarea id="csv-input" aria-label="CSV 人员数据" value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="姓名,部门,岗位" rows={6} />
        <div className="import-hint"><UploadCloud size={15} /> 每行填写姓名、部门、岗位，用英文逗号分隔。</div>
        <div className="campaign-actions"><button className="button button-primary" type="button" onClick={importRoster} disabled={!csv.trim()}><UploadCloud size={17} /> 导入全局花名册</button><button className="button" type="button" onClick={() => downloadCsv("全局花名册.csv", buildRosterDirectoryCsv(roster))} disabled={!roster.length}><Download size={16} /> 导出全局花名册 CSV</button></div>
        {saveError && <p className="form-error" role="alert">{saveError}</p>}
        {message && <p className="success-message" role="status"><CheckCircle2 size={15} /> {message}</p>}
        {errors.length > 0 && <div className="import-errors">{errors.map((error) => <span key={`${error.row}-${error.message}`}>第 {error.row} 行：{error.message}</span>)}</div>}
      </article>
      <article className="admin-panel import-explain"><span className="section-kicker">REUSE POLICY</span><h2>花名册复用规则</h2><ul className="plain-list"><li><CheckCircle2 size={16} /> 新建测评批次会默认纳入全部花名册人员。</li><li><CheckCircle2 size={16} /> 可在当前批次取消勾选少数不参与的人员。</li><li><CheckCircle2 size={16} /> 已有草稿或结果的人员会保留，避免误删测评记录。</li></ul></article>
    </section>
    <article className="admin-panel">
      <div className="panel-heading"><div><span className="section-kicker">CAMPAIGN MEMBERS</span><h2>批次成员 <span className="heading-count">{participants.length}</span></h2></div><div className="campaign-actions"><label className="field-label" htmlFor="campaign-select">测评批次</label><select id="campaign-select" aria-label="目标测评批次" value={campaignId} onChange={(event) => setCampaignId(event.target.value)} disabled={!campaigns.length}><option value="">请选择批次</option>{campaigns.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button className="button" type="button" onClick={syncRoster} disabled={!campaignId || !roster.length}><UsersRound size={16} /> 同步全部花名册</button></div></div>
      {!campaign ? <div className="table-empty">尚未创建测评批次</div> : <div className="people-table-wrap"><table className="results-table people-table"><thead><tr><th>员工</th><th>部门</th><th>岗位</th><th>参与本批次</th></tr></thead><tbody>{roster.map((person) => <tr key={person.id}><td><strong>{person.name}</strong></td><td>{person.department}</td><td>{person.position}</td><td><input type="checkbox" aria-label={`${person.name} 参加 ${campaign.name}`} checked={enrolledRosterIds.has(person.id)} onChange={(event) => void setEnrollment(person.id, event.target.checked)} /></td></tr>)}</tbody></table>{!roster.length && <div className="table-empty">请先导入全局花名册</div>}</div>}
    </article>
  </div>;
}
