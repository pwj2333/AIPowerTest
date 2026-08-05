import { AlertTriangle, CheckCircle2, ChevronDown, Download, FileQuestion, RotateCcw, Save, Upload } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { defaultQuestionMarkdown, getDimensionLabel, parseQuestionMarkdown } from "../domain/questions";
import { analyzeQuestionItems, type ItemQualityStatus } from "../domain/scoring";
import { assessmentRepository } from "../domain/store";

const qualityLabels: Record<ItemQualityStatus, string> = {
  insufficient: "待样本",
  "too-easy": "过易",
  "too-hard": "过难",
  "low-discrimination": "低区分度",
  healthy: "表现正常"
};

export default function QuestionBankPage() {
  const [bank, setBank] = useState(() => assessmentRepository.getQuestionBank());
  const [source, setSource] = useState(bank.markdown);
  const [openQuestion, setOpenQuestion] = useState(bank.questions[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const parsed = useMemo(() => {
    try {
      return { questions: parseQuestionMarkdown(source), error: "" };
    } catch (error) {
      return { questions: [], error: error instanceof Error ? error.message : "题库格式无法识别。" };
    }
  }, [source]);
  const levelSummary = useMemo(() => Array.from({ length: 8 }, (_, index) => `L${index + 1} ${parsed.questions.filter((question) => question.level === index + 1).length}`).join(" · "), [parsed.questions]);
  const currentResponses = useMemo(() => assessmentRepository.listCampaigns()
    .flatMap((campaign) => assessmentRepository.listResults(campaign.id))
    .filter((result) => (result.questionVersion ?? "v1.0") === bank.version)
    .map((result) => result.answers), [bank.version]);
  const itemDiagnostics = useMemo(() => analyzeQuestionItems(currentResponses, bank.questions), [bank.questions, currentResponses]);
  const flaggedItems = itemDiagnostics.filter((item) => item.status !== "insufficient" && item.status !== "healthy").length;

  const save = async () => {
    if (parsed.error) return;
    const saved = assessmentRepository.saveQuestionBank(source);
    try {
      await assessmentRepository.flush();
      setBank(saved);
      setOpenQuestion(saved.questions[0]?.id ?? "");
      setMessage(`已保存 ${saved.version}，开放批次将使用这 ${saved.questions.length} 道题`);
    } catch {
      await assessmentRepository.initialize().catch(() => undefined);
      setBank(assessmentRepository.getQuestionBank());
      setMessage("题库保存失败，请稍后重试。");
    }
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setMessage("文件超过 1 MB，未载入。");
      return;
    }
    try {
      setSource(await file.text());
      setMessage("");
    } catch {
      setMessage("文件读取失败，原题库未改变。");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([source], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ai-question-bank-${bank.version}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <div className="admin-page">
    <div className="page-title-row"><div><span className="section-kicker">QUESTION BANK · {bank.version.toUpperCase()}</span><h1>Markdown 题库</h1><p>题目、能力层级与计分键统一保存在当前题库版本中。</p></div><span className={`editor-status ${parsed.error ? "is-error" : "is-valid"}`}>{parsed.error ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}{parsed.error ? "待修正" : `${parsed.questions.length} 题有效 · ${levelSummary}`}</span></div>
    {message && <p className={message.includes("未载入") || message.includes("失败") ? "form-error" : "success-message"} role="status">{message}</p>}
    <section className="question-editor-layout">
      <article className="admin-panel markdown-editor-panel">
        <div className="panel-heading"><div><span className="section-kicker">MARKDOWN SOURCE</span><h2>题库源文件</h2></div><div className="editor-toolbar"><label className="button button-ghost file-button"><Upload size={16} /> 导入 .md<input type="file" accept=".md,.markdown,text/markdown,text/plain" onChange={loadFile} /></label><button className="icon-button" type="button" title="下载 Markdown" onClick={download}><Download size={17} /></button><button className="icon-button" type="button" title="恢复默认题库" onClick={() => { setSource(defaultQuestionMarkdown); setMessage(""); }}><RotateCcw size={17} /></button></div></div>
        <textarea className="markdown-editor" aria-label="Markdown 题库内容" spellCheck={false} value={source} onChange={(event) => { setSource(event.target.value); setMessage(""); }} />
        <div className={`editor-validation ${parsed.error ? "is-error" : ""}`} aria-live="polite">{parsed.error ? <><AlertTriangle size={15} /> {parsed.error}</> : <><CheckCircle2 size={15} /> L1–L8 与四个能力维度均已覆盖</>}</div>
        <button className="button button-primary" type="button" onClick={save} disabled={Boolean(parsed.error) || source === bank.markdown}><Save size={17} /> 保存新版本</button>
      </article>
      <article className="admin-panel question-preview-panel">
        <div className="panel-heading"><div><span className="section-kicker">LIVE PREVIEW</span><h2>题目预览</h2></div><FileQuestion size={20} className="heading-icon" /></div>
        {parsed.error ? <div className="preview-empty"><AlertTriangle size={22} /><span>修正格式后显示预览</span></div> : <div className="question-list">{parsed.questions.map((question, index) => <div className={`question-bank-item ${openQuestion === question.id ? "is-open" : ""}`} key={question.id}><button type="button" onClick={() => setOpenQuestion(openQuestion === question.id ? "" : question.id)}><span className="question-number">{String(index + 1).padStart(2, "0")}</span><span><strong>L{question.level} · {question.category}</strong><small>{getDimensionLabel(question.dimension)}</small></span><ChevronDown size={16} /></button>{openQuestion === question.id && <div className="question-bank-detail"><p>{question.prompt}</p><ol>{[...question.options].sort((left, right) => left.score - right.score).map((option) => <li key={option.id}><span>{option.label}</span><b>{option.score} 分</b></li>)}</ol></div>}</div>)}</div>}
      </article>
    </section>
    <section className="calibration-note"><div><span className="section-kicker">CALIBRATION</span><h2>分布需要真实样本校准</h2></div><p>当前采用连续总分与固定等级切点，避免单题门槛造成低等级堆积。达到 30 份有效答卷后，再根据偏度、离散度和题目区分度调整切点；系统不会为了得到钟形曲线而改写个人分数。</p></section>
    <article className="admin-panel item-analysis-panel" id="item-analysis">
      <div className="panel-heading"><div><span className="section-kicker">ITEM ANALYSIS · {bank.version.toUpperCase()}</span><h2>题目质量诊断</h2></div><span className={`item-analysis-summary ${flaggedItems ? "has-flags" : ""}`}>{currentResponses.length < 30 ? `${currentResponses.length} / 30 份有效答卷` : flaggedItems ? `${flaggedItems} 题需要复核` : "当前题目表现正常"}</span></div>
      <div className="item-analysis-head" aria-hidden="true"><span>题目</span><span>均分</span><span>区分度</span><span>选项分布 0 / 1 / 2 / 3</span><span>状态</span></div>
      <div className="item-analysis-list">{bank.questions.map((question, index) => {
        const diagnostics = itemDiagnostics[index];
        const total = Math.max(diagnostics.sampleSize, 1);
        return <div className="item-analysis-row" key={question.id}><div className="item-analysis-question"><strong>{String(index + 1).padStart(2, "0")} · {question.category}</strong><span>{question.prompt}</span></div><div className="item-stat"><small>均分</small><strong>{diagnostics.sampleSize ? diagnostics.meanScore.toFixed(2) : "-"}</strong></div><div className="item-stat"><small>区分度</small><strong>{diagnostics.sampleSize >= 30 ? diagnostics.discrimination.toFixed(2) : "-"}</strong></div><div className="option-distribution" aria-label={`${question.id} 的选项分布`}><div>{diagnostics.optionCounts.map((count, score) => <span className={`option-score-${score}`} style={{ width: `${(count / total) * 100}%` }} key={score} />)}</div><small>{diagnostics.optionCounts.join(" / ")}</small></div><span className={`item-quality status-${diagnostics.status}`}>{qualityLabels[diagnostics.status]}</span></div>;
      })}</div>
    </article>
  </div>;
}
