import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, LockKeyhole, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import QuestionCard from "../components/QuestionCard";
import { questions } from "../domain/questions";
import { assessmentRepository } from "../domain/store";

export default function AssessmentPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const participant = useMemo(() => (token ? assessmentRepository.getParticipantByToken(token) : undefined), [token]);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => participant ? assessmentRepository.getDraft(participant.id) : {});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (participant && assessmentRepository.getResult(participant.id)) navigate(`/result/${participant.token}`, { replace: true });
  }, [navigate, participant]);

  if (!participant) return <InvalidLink />;
  const campaign = assessmentRepository.getCampaign(participant.campaignId);
  if (!campaign) return <InvalidLink message="这条测评链接对应的批次已不存在。" />;

  const selectAnswer = (optionId: string) => {
    const next = { ...answers, [questions[current].id]: optionId };
    setAnswers(next);
    assessmentRepository.saveDraft(participant.id, next);
    setError("");
  };

  const submit = () => {
    if (Object.keys(answers).length !== questions.length) {
      setError("还有题目未完成，请按进度检查后再提交。");
      return;
    }
    try {
      assessmentRepository.submitAssessment(participant.id, answers, startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 600);
      navigate(`/result/${participant.token}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败，请稍后重试。");
    }
  };

  if (!started) return <AssessmentWelcome participant={participant} onStart={() => { setStarted(true); setStartedAt(Date.now()); }} />;

  const question = questions[current];
  const selected = answers[question.id];
  return (
    <main className="assessment-page page-width">
      <header className="assessment-header"><Link to="/" className="brand-lockup"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>员工测评</small></span></Link><span className="assessment-person">{participant.name} · {participant.department}</span></header>
      <section className="assessment-workspace">
        <div className="assessment-progress"><div><span>AI 能力测评</span><strong>第 {current + 1} / {questions.length} 题</strong></div><div className="progress-track"><span style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div></div>
        <QuestionCard question={question} selectedOption={selected} onSelect={selectAnswer} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="question-actions"><button className="button button-ghost" type="button" onClick={() => setCurrent((index) => Math.max(0, index - 1))} disabled={current === 0}><ArrowLeft size={17} /> 上一题</button>{current === questions.length - 1 ? <button className="button button-primary" type="button" onClick={submit}><CheckCircle2 size={17} /> 提交测评</button> : <button className="button button-primary" type="button" onClick={() => selected && setCurrent((index) => index + 1)} disabled={!selected}>下一题 <ArrowRight size={17} /></button>}</div>
        <p className="assessment-footnote"><LockKeyhole size={14} /> 不需要上传业务资料；请仅根据你平时真实的工作方式作答。</p>
      </section>
    </main>
  );
}

function AssessmentWelcome({ participant, onStart }: { participant: NonNullable<ReturnType<typeof assessmentRepository.getParticipantByToken>>; onStart: () => void }) {
  return <main className="welcome-page page-width"><header className="assessment-header"><Link to="/" className="brand-lockup"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>员工测评</small></span></Link><span className="assessment-person">专属测评链接</span></header><section className="welcome-card"><span className="eyebrow">PERSONAL GROWTH ASSESSMENT</span><h1>你好，{participant.name}</h1><p className="welcome-lead">这份测评将判断你在 AI 使用能力的真实阶段，并给出下一阶段可以立即执行的加强任务。</p><div className="welcome-info"><div><Clock3 size={18} /><span><strong>8–12 分钟</strong><small>共 20 道工作情景题</small></span></div><div><LockKeyhole size={18} /><span><strong>仅用于成长诊断</strong><small>结果不单独作为绩效依据</small></span></div><div><RotateCcw size={18} /><span><strong>可返回修改</strong><small>提交后可随时查看结果</small></span></div></div><div className="identity-line"><span>部门</span><strong>{participant.department}</strong><span>岗位</span><strong>{participant.position}</strong></div><button className="button button-primary button-wide" type="button" onClick={onStart}>开始答题 <ArrowRight size={18} /></button></section></main>;
}

function InvalidLink({ message = "这条测评链接无效或已失效。" }: { message?: string }) {
  return <main className="empty-state page-width"><div className="empty-state-icon"><LockKeyhole size={26} /></div><h1>无法打开测评</h1><p>{message}</p><Link to="/" className="button button-primary">返回首页</Link></main>;
}
