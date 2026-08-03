import { CheckCircle2, Download, FileUp, UploadCloud, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildRosterCsv } from "../domain/exports";
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
  const [copyTargetId, setCopyTargetId] = useState(() => campaigns.find((item) => item.id !== campaignId)?.id ?? "");
  const [csv, setCsv] = useState("");
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const participants = useMemo(() => assessmentRepository.listParticipants(campaignId), [campaignId, refreshKey]);
  const campaign = campaigns.find((item) => item.id === campaignId);
  const results = campaign ? assessmentRepository.listResults(campaign.id) : [];
  const targetCampaigns = campaigns.filter((item) => item.id !== campaignId);

  useEffect(() => {
    if (copyTargetId === campaignId || !targetCampaigns.some((item) => item.id === copyTargetId)) {
      setCopyTargetId(targetCampaigns[0]?.id ?? "");
    }
  }, [campaignId, copyTargetId, targetCampaigns]);

  const reload = () => {
    setCampaigns(assessmentRepository.listCampaigns());
    setRefreshKey((value) => value + 1);
  };

  const importPeople = async () => {
    setSaveError("");
    const report = assessmentRepository.importParticipants(campaignId, parseCsv(csv));
    try {
      await assessmentRepository.flush();
      setMessage(`成功导入 ${report.imported.length} 人`);
      setErrors(report.errors);
      setCsv("");
      reload();
    } catch {
      await assessmentRepository.initialize().catch(() => undefined);
      reload();
      setSaveError("人员数据保存失败，请稍后重试。");
    }
  };

  const copyPeople = async () => {
    if (!campaignId || !copyTargetId) return;
    setSaveError("");
    const report = assessmentRepository.copyParticipants(campaignId, copyTargetId);
    try {
      await assessmentRepository.flush();
      setMessage(`复制 ${report.imported.length} 人，跳过 ${report.skipped.length} 人`);
      reload();
    } catch {
      await assessmentRepository.initialize().catch(() => undefined);
      reload();
      setSaveError("人员复制保存失败，请稍后重试。");
    }
  };

  const exportPeople = () => downloadCsv(`${campaign?.name ?? "people"}-人员.csv`, buildRosterCsv(participants, results));

  return <div className="admin-page">
    <div className="page-title-row">
      <div><span className="section-kicker">PEOPLE</span><h1>人员名单</h1><p>管理人员资料，支持在不同测评批次之间复用，并导出当前批次花名册。</p></div>
    </div>
    <section className="import-layout">
      <article className="admin-panel import-panel">
        <div className="panel-heading"><div><span className="section-kicker">IMPORT PEOPLE</span><h2>导入人员</h2></div><FileUp size={20} className="heading-icon" /></div>
        <label className="field-label" htmlFor="campaign-select">目标测评批次</label>
        <select id="campaign-select" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
          {campaigns.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
        <label className="field-label" htmlFor="csv-input">CSV 人员数据</label>
        <textarea id="csv-input" aria-label="CSV 人员数据" value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="姓名,部门,岗位" rows={6} />
        <div className="import-hint"><UploadCloud size={15} /> 每行填写姓名、部门、岗位，用英文逗号分隔。</div>
        <button className="button button-primary" type="button" onClick={importPeople} disabled={!csv.trim() || !campaignId}><UploadCloud size={17} /> 导入人员</button>
        {!campaignId && <p className="form-error" role="alert">请先创建测评批次。</p>}
        {saveError && <p className="form-error" role="alert">{saveError}</p>}
        {message && <p className="success-message" role="status"><CheckCircle2 size={15} /> {message}</p>}
        {errors.length > 0 && <div className="import-errors">{errors.map((error) => <span key={`${error.row}-${error.message}`}>第 {error.row} 行：{error.message}</span>)}</div>}
        <div className="panel-divider" />
        <label className="field-label" htmlFor="copy-target-select">复制到批次</label>
        <select id="copy-target-select" value={copyTargetId} onChange={(event) => setCopyTargetId(event.target.value)} disabled={!targetCampaigns.length}>
          {!targetCampaigns.length && <option value="">暂无其他批次</option>}
          {targetCampaigns.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
        <button className="button" type="button" onClick={copyPeople} disabled={!campaignId || !copyTargetId || !participants.length}><UsersRound size={17} /> 复制人员</button>
      </article>
      <article className="admin-panel import-explain"><span className="section-kicker">IDENTITY POLICY</span><h2>姓名核验规则</h2><ul className="plain-list"><li><CheckCircle2 size={16} /> 员工输入姓名，匹配成功后进入测评。</li><li><CheckCircle2 size={16} /> 未找到姓名时，系统提示员工联系管理员。</li><li><CheckCircle2 size={16} /> 每名员工在一个批次只能提交一次。</li></ul></article>
    </section>
    <article className="admin-panel">
      <div className="panel-heading"><div><span className="section-kicker">{campaign?.name ?? "暂无测评批次"}</span><h2>已登记人员 <span className="heading-count">{participants.length}</span></h2></div><div className="campaign-actions"><button className="button" type="button" onClick={exportPeople} disabled={!participants.length}><Download size={16} /> 导出人员 CSV</button><UsersRound size={20} className="heading-icon" /></div></div>
      <div className="people-table-wrap"><table className="results-table people-table"><thead><tr><th>员工</th><th>部门</th><th>岗位</th><th>状态</th></tr></thead><tbody>{participants.map((participant) => { const completed = Boolean(assessmentRepository.getResult(participant.id)); return <tr key={participant.id}><td><strong>{participant.name}</strong></td><td>{participant.department}</td><td>{participant.position}</td><td><span className={`completion-status ${completed ? "is-complete" : ""}`}>{completed ? "已完成" : "待开始"}</span></td></tr>; })}</tbody></table></div>
    </article>
  </div>;
}
