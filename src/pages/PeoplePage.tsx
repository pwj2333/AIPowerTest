import { CheckCircle2, FileUp, UploadCloud, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { assessmentRepository, type RosterRow } from "../domain/store";

function parseCsv(value: string): RosterRow[] {
  return value.trim().split(/\r?\n/).filter(Boolean).slice(value.includes("姓名") ? 1 : 0).map((line) => { const [name = "", department = "", position = ""] = line.split(","); return { name, department, position }; });
}

export default function PeoplePage() {
  const [campaigns] = useState(() => assessmentRepository.listCampaigns());
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [csv, setCsv] = useState("");
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const participants = useMemo(() => assessmentRepository.listParticipants(campaignId), [campaignId, message]);
  const campaign = campaigns.find((item) => item.id === campaignId);
  const importPeople = async () => {
    setSaveError("");
    const report = assessmentRepository.importParticipants(campaignId, parseCsv(csv));
    try {
      await assessmentRepository.flush();
      setMessage(`成功导入 ${report.imported.length} 人`);
      setErrors(report.errors);
      setCsv("");
    } catch {
      await assessmentRepository.initialize().catch(() => undefined);
      setSaveError("人员数据保存失败，请稍后重试。");
    }
  };
  return <div className="admin-page"><div className="page-title-row"><div><span className="section-kicker">PEOPLE</span><h1>人员名单</h1><p>管理员登记姓名、部门和岗位，员工在首页输入姓名即可进入测评。</p></div></div><section className="import-layout"><article className="admin-panel import-panel"><div className="panel-heading"><div><span className="section-kicker">IMPORT PEOPLE</span><h2>导入人员</h2></div><FileUp size={20} className="heading-icon" /></div><label className="field-label" htmlFor="campaign-select">目标测评批次</label><select id="campaign-select" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>{campaigns.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><label className="field-label" htmlFor="csv-input">CSV 人员数据</label><textarea id="csv-input" aria-label="CSV 人员数据" value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="姓名,部门,岗位" rows={6} /><div className="import-hint"><UploadCloud size={15} /> 每行填写姓名、部门、岗位，用英文逗号分隔。</div><button className="button button-primary" type="button" onClick={importPeople} disabled={!csv.trim() || !campaignId}><UploadCloud size={17} /> 导入人员</button>{!campaignId && <p className="form-error" role="alert">请先创建测评批次。</p>}{saveError && <p className="form-error" role="alert">{saveError}</p>}{message && <p className="success-message" role="status"><CheckCircle2 size={15} /> {message}</p>}{errors.length > 0 && <div className="import-errors">{errors.map((error) => <span key={`${error.row}-${error.message}`}>第 {error.row} 行：{error.message}</span>)}</div>}</article><article className="admin-panel import-explain"><span className="section-kicker">IDENTITY POLICY</span><h2>姓名核验规则</h2><ul className="plain-list"><li><CheckCircle2 size={16} /> 员工输入姓名，匹配成功后进入测评。</li><li><CheckCircle2 size={16} /> 未找到姓名时，系统提示员工联系管理员。</li><li><CheckCircle2 size={16} /> 每名员工在一个批次只能提交一次。</li></ul></article></section><article className="admin-panel"><div className="panel-heading"><div><span className="section-kicker">{campaign?.name ?? "暂无测评批次"}</span><h2>已登记人员 <span className="heading-count">{participants.length}</span></h2></div><UsersRound size={20} className="heading-icon" /></div><div className="people-table-wrap"><table className="results-table people-table"><thead><tr><th>员工</th><th>部门</th><th>岗位</th><th>状态</th></tr></thead><tbody>{participants.map((participant) => { const completed = Boolean(assessmentRepository.getResult(participant.id)); return <tr key={participant.id}><td><strong>{participant.name}</strong></td><td>{participant.department}</td><td>{participant.position}</td><td><span className={`completion-status ${completed ? "is-complete" : ""}`}>{completed ? "已完成" : "待开始"}</span></td></tr>; })}</tbody></table></div></article></div>;
}
