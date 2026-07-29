import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, LockKeyhole, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import QuestionCard from "../components/QuestionCard";
import { getDimensionLabel } from "../domain/questions";
import { assessmentRepository, type Participant } from "../domain/store";

const verificationKey = (token: string) => `assessment-identity:${token}`;

export default function AssessmentPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const participant = useMemo(() => assessmentRepository.getParticipantByToken(token), [token]);
  const questionBank = useMemo(() => assessmentRepository.getQuestionBank(), []);
  const activeQuestions = questionBank.questions;
  const [verified, setVerified] = useState(() => Boolean(token && sessionStorage.getItem(verificationKey(token))));
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (!participant) return {};
    const questionIds = new Set(activeQuestions.map((question) => question.id));
    return Object.fromEntries(Object.entries(assessmentRepository.getDraft(participant.id)).filter(([questionId]) => questionIds.has(questionId)));
  });
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (verified && participant && assessmentRepository.getResult(participant.id)) navigate(`/result/${participant.token}`, { replace: true });
  }, [navigate, participant, verified]);

  if (!participant) return <InvalidLink />;
  const campaign = assessmentRepository.getCampaign(participant.campaignId);
  if (!campaign) return <InvalidLink message="这条测评链接对应的批次已不存在。" />;
  if (!verified) return <IdentityGate token={token} onVerified={() => { sessionStorage.setItem(verificationKey(token), "verified"); setVerified(true); }} />;
  if (!started) return <AssessmentWelcome participant={participant} questionCount={activeQuestions.length} onStart={() => { setStarted(true); setStartedAt(Date.now()); }} />;

  const question = activeQuestions[current];
  const selected = answers[question.id];
  const answeredCount = Object.keys(answers).length;

  const selectAnswer = (optionId: string) => {
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    assessmentRepository.saveDraft(participant.id, next);
    setError("");
  };

  const submit = async () => {
    if (activeQuestions.some((item) => !answers[item.id])) {
      setError("还有题目未完成，请在题目轨迹中检查后再提交。");
      return;
    }
    try {
      assessmentRepository.submitAssessment(participant.id, answers, startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 600);
      await assessmentRepository.flush();
      navigate(`/result/${participant.token}`);
    } catch (submitError) {
      await assessmentRepository.initialize().catch(() => undefined);
      setError(submitError instanceof Error ? submitError.message : "提交失败，请稍后重试。");
    }
  };

  return (
    <main className="assessment-page page-width">
      <header className="assessment-header"><Link to="/" className="brand-lockup"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>互动情景测评</small></span></Link><span className="assessment-person"><ShieldCheck size={14} /> {participant.name} · {participant.department}</span></header>
      <section className="assessment-workspace">
        <div className="assessment-progress"><div><span>{getDimensionLabel(question.dimension)}</span><strong>{answeredCount} / {activeQuestions.length} 已作答</strong></div><div className="progress-track"><span style={{ width: `${(answeredCount / activeQuestions.length) * 100}%` }} /></div></div>
        <nav className="question-map" aria-label="题目轨迹">
          {activeQuestions.map((item, index) => <button className={`${index === current ? "is-current" : ""} ${answers[item.id] ? "is-answered" : ""}`} type="button" key={item.id} onClick={() => setCurrent(index)} aria-label={`第 ${index + 1} 题${answers[item.id] ? "，已作答" : "，未作答"}`} aria-current={index === current ? "step" : undefined}>{answers[item.id] ? <CheckCircle2 size={13} /> : index + 1}</button>)}
        </nav>
        <div className="question-stage" key={question.id}><QuestionCard question={question} selectedOption={selected} onSelect={selectAnswer} seed={participant.id} /></div>
        <div className="selection-status" aria-live="polite">{selected ? <><CheckCircle2 size={15} /> 已记录选择，可继续或返回修改</> : <><span className="selection-pulse" /> 请选择最接近你日常做法的一项</>}</div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="question-actions"><button className="button button-ghost" type="button" onClick={() => setCurrent((index) => Math.max(0, index - 1))} disabled={current === 0}><ArrowLeft size={17} /> 上一题</button>{current === activeQuestions.length - 1 ? <button className="button button-primary" type="button" onClick={submit}><CheckCircle2 size={17} /> 提交测评</button> : <button className="button button-primary" type="button" onClick={() => selected && setCurrent((index) => index + 1)} disabled={!selected}>下一题 <ArrowRight size={17} /></button>}</div>
        <p className="assessment-footnote"><LockKeyhole size={14} /> 不需要上传业务资料；请仅根据平时真实做法作答。</p>
      </section>
    </main>
  );
}

function IdentityGate({ token, onVerified }: { token: string; onVerified: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!assessmentRepository.verifyParticipantName(token, name)) {
      setError("未找到该姓名，请联系管理员。");
      return;
    }
    try {
      await assessmentRepository.flush();
      onVerified();
    } catch {
      await assessmentRepository.initialize().catch(() => undefined);
      setError("系统暂时无法保存数据，请稍后重试。");
    }
  };

  return <main className="identity-page page-width"><header className="assessment-header"><Link to="/" className="brand-lockup"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>身份核验</small></span></Link><span className="assessment-person"><LockKeyhole size={14} /> 姓名验证</span></header><section className="identity-gate"><div className="identity-emblem"><UserRound size={26} /><span><ShieldCheck size={14} /></span></div><span className="eyebrow">IDENTITY CHECK</span><h1>请输入姓名</h1><p>输入管理员登记的姓名，确认后即可进入测评。</p><form onSubmit={verify}><label htmlFor="employee-name">姓名</label><input id="employee-name" autoComplete="name" autoFocus maxLength={60} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="请输入姓名" />{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-wide" type="submit" disabled={!name.trim()}>确认并进入 <ArrowRight size={17} /></button></form><div className="identity-security"><LockKeyhole size={14} /> 系统仅核验姓名，不会自动创建未登记人员</div></section></main>;
}

function AssessmentWelcome({ participant, questionCount, onStart }: { participant: Participant; questionCount: number; onStart: () => void }) {
  return <main className="welcome-page page-width"><header className="assessment-header"><Link to="/" className="brand-lockup"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>员工测评</small></span></Link><span className="assessment-person"><ShieldCheck size={14} /> 身份已匹配</span></header><section className="welcome-card is-verified"><div className="verified-line"><CheckCircle2 size={17} /> 姓名核验成功</div><span className="eyebrow">PERSONAL GROWTH ASSESSMENT</span><h1>你好，{participant.name}</h1><p className="welcome-lead">这份测评关注你在真实工作情景中的取舍，并给出下一阶段可以立即执行的加强任务。</p><div className="welcome-info"><div><Clock3 size={18} /><span><strong>约 8–12 分钟</strong><small>共 {questionCount} 道工作情景题</small></span></div><div><LockKeyhole size={18} /><span><strong>仅用于成长诊断</strong><small>结果不单独作为绩效依据</small></span></div><div><RotateCcw size={18} /><span><strong>可返回修改</strong><small>提交后可随时查看结果</small></span></div></div><div className="identity-line"><span>部门</span><strong>{participant.department}</strong><span>岗位</span><strong>{participant.position}</strong></div><button className="button button-primary button-wide" type="button" onClick={onStart}>开始答题 <ArrowRight size={18} /></button></section></main>;
}

function InvalidLink({ message = "这条测评链接无效或已失效。" }: { message?: string }) {
  return <main className="empty-state page-width"><div className="empty-state-icon"><LockKeyhole size={26} /></div><h1>无法打开测评</h1><p>{message}</p><Link to="/" className="button button-primary">返回首页</Link></main>;
}
