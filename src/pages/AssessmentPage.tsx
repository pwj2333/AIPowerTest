import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, LockKeyhole, RotateCcw, ShieldCheck, Sparkles, Trophy, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import QuestionCard from "../components/QuestionCard";
import { evaluateStage, orderStageQuestionsForDisplay, selectStageQuestions } from "../domain/scoring";
import { getDimensionLabel, getGrade } from "../domain/questions";
import { assessmentRepository, type AssessmentDraft, type Participant } from "../domain/store";

const verificationKey = (token: string) => `assessment-identity:${token}`;
const displayOrderKey = (token: string, version: string) => `assessment-display-order:${token}:${version}`;

function makeDisplaySeed(token: string, version: string, forceNew = false): string {
  const key = displayOrderKey(token, version);
  const stored = forceNew ? "" : sessionStorage.getItem(key);
  if (stored) return stored;
  const generated = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(key, generated);
  return generated;
}

export default function AssessmentPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [verified, setVerified] = useState(() => Boolean(token && sessionStorage.getItem(verificationKey(token))));
  const participant = useMemo(() => assessmentRepository.getParticipantByToken(token), [token, verified]);
  const questionBank = useMemo(() => assessmentRepository.getQuestionBank(), [verified]);
  const existingDraft = useMemo(() => participant ? assessmentRepository.getDraft(participant.id) : undefined, [participant]);
  const draftIsFresh = Boolean(existingDraft && !existingDraft.resetRequired && existingDraft.questionVersion === questionBank.version);
  const [started, setStarted] = useState(draftIsFresh);
  const [activeLevel, setActiveLevel] = useState(draftIsFresh ? existingDraft?.activeLevel ?? 1 : 1);
  const [answers, setAnswers] = useState<Record<string, string>>(draftIsFresh ? existingDraft?.answers ?? {} : {});
  const [startedAt, setStartedAt] = useState<number | null>(draftIsFresh && existingDraft?.startedAt ? Date.parse(existingDraft.startedAt) : null);
  const [current, setCurrent] = useState(0);
  const [advance, setAdvance] = useState(false);
  const [error, setError] = useState("");
  const [displaySeed, setDisplaySeed] = useState(() => sessionStorage.getItem(displayOrderKey(token, questionBank.version)) ?? "");

  useEffect(() => {
    if (!started || !participant || displaySeed) return;
    setDisplaySeed(makeDisplaySeed(participant.token, questionBank.version));
  }, [displaySeed, participant, questionBank.version, started]);

  useEffect(() => {
    if (verified && participant && assessmentRepository.getResult(participant.id)) navigate(`/result/${participant.token}`, { replace: true });
  }, [navigate, participant, verified]);

  useEffect(() => {
    if (!participant) return;
    const stage = selectStageQuestions(questionBank.questions, activeLevel, `${participant.id}:${questionBank.version}`);
    const evaluation = evaluateStage(stage, answers);
    const answered = stage.filter((question) => Boolean(answers[question.id])).length;
    const count = Math.min(5, Math.max(1, answered + 1));
    if (current >= count) setCurrent(Math.max(0, count - 1));
  }, [activeLevel, answers, current, participant, questionBank.questions, questionBank.version]);

  if (!participant) return <IdentityGate token={token} onVerified={() => { sessionStorage.setItem(verificationKey(token), "verified"); setVerified(true); }} />;
  const campaign = assessmentRepository.getCampaign(participant.campaignId);
  if (!campaign) return <InvalidLink message="这条测评链接对应的批次已不存在。" />;
  if (!verified) return <IdentityGate token={token} onVerified={() => { sessionStorage.setItem(verificationKey(token), "verified"); setVerified(true); }} />;
  if (!started) return <AssessmentWelcome participant={participant} questionCount={5} resetRequired={Boolean(existingDraft?.resetRequired)} onStart={() => {
    const now = Date.now();
    setDisplaySeed(makeDisplaySeed(participant.token, questionBank.version, !draftIsFresh));
    const draft: AssessmentDraft = { questionVersion: questionBank.version, activeLevel: 1, startedAt: new Date(now).toISOString(), answers: {} };
    setAnswers({});
    setActiveLevel(1);
    setStartedAt(now);
    setStarted(true);
    setAdvance(false);
    assessmentRepository.saveDraft(participant.id, draft);
  }} />;

  const seed = `${participant.id}:${questionBank.version}`;
  const stageQuestions = selectStageQuestions(questionBank.questions, activeLevel, seed);
  const stageEvaluation = evaluateStage(stageQuestions, answers);
  const answeredInStage = stageQuestions.filter((question) => Boolean(answers[question.id])).length;
  const visibleCount = Math.min(5, Math.max(1, answeredInStage + 1));
  const displayQuestions = orderStageQuestionsForDisplay(stageQuestions, `${displaySeed || seed}:L${activeLevel}`);
  const visibleQuestions = displayQuestions.slice(0, visibleCount);
  const question = visibleQuestions[Math.min(current, visibleQuestions.length - 1)];

  const saveDraft = (nextAnswers: Record<string, string>, level = activeLevel) => {
    const draft: AssessmentDraft = {
      questionVersion: questionBank.version,
      activeLevel: level,
      startedAt: new Date(startedAt ?? Date.now()).toISOString(),
      answers: nextAnswers
    };
    assessmentRepository.saveDraft(participant.id, draft);
  };

  const selectAnswer = (optionId: string) => {
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    saveDraft(next);
    setError("");
  };

  const submitStage = async () => {
    if (stageEvaluation.status === "incomplete") {
      setError("请完成本关 5 道题后再提交。");
      return;
    }
    const acceptedIds = new Set(stageQuestions.slice(0, stageEvaluation.questionCount).map((question) => question.id));
    const stageIds = new Set(stageQuestions.map((question) => question.id));
    const finalAnswers = Object.fromEntries(Object.entries(answers).filter(([questionId]) => !stageIds.has(questionId) || acceptedIds.has(questionId)));
    setAnswers(finalAnswers);
    if (stageEvaluation.status === "passed" && activeLevel < 8) {
      saveDraft(finalAnswers);
      setAdvance(true);
      setError("");
      return;
    }
    try {
      assessmentRepository.submitAssessment(participant.id, finalAnswers, startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 600);
      await assessmentRepository.flush();
      navigate(`/result/${participant.token}`);
    } catch (submitError) {
      await assessmentRepository.initialize().catch(() => undefined);
      setError(submitError instanceof Error ? submitError.message : "提交失败，请稍后重试。" );
    }
  };

  if (advance) return <StageAdvance level={activeLevel} onContinue={() => {
    const nextLevel = activeLevel + 1;
    setActiveLevel(nextLevel);
    setCurrent(0);
    setAdvance(false);
    saveDraft(answers, nextLevel);
  }} />;

  return (
    <main className="assessment-page page-width">
      <header className="assessment-header"><Link to="/" className="brand-lockup"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>互动情景测评</small></span></Link><span className="assessment-person"><ShieldCheck size={14} /> {participant.name} · {participant.department}</span></header>
      <section className="assessment-workspace">
        <div className="assessment-progress"><div><span>L{activeLevel} · {getDimensionLabel(question.dimension)}</span><strong>{answeredInStage} / 5 本关已作答</strong></div><div className="progress-track"><span style={{ width: `${(answeredInStage / 5) * 100}%` }} /></div></div>
        <nav className="question-map" aria-label="本关题目轨迹">
          {visibleQuestions.map((item, index) => <button className={`${index === current ? "is-current" : ""} ${answers[item.id] ? "is-answered" : ""}`} type="button" key={item.id} onClick={() => setCurrent(index)} aria-label={`第 ${index + 1} 题${answers[item.id] ? "，已作答" : "，未作答"}`} aria-current={index === current ? "step" : undefined}>{answers[item.id] ? <CheckCircle2 size={13} /> : index + 1}</button>)}
        </nav>
        <div className="question-stage" key={question.id}><QuestionCard question={question} selectedOption={answers[question.id]} onSelect={selectAnswer} seed={`${displaySeed || seed}:L${activeLevel}`} /></div>
        <div className="selection-status" aria-live="polite">{answers[question.id] ? <><CheckCircle2 size={15} /> 已记录选择，可继续或返回修改</> : <><span className="selection-pulse" /> 请选择最接近你日常做法的一项</>}</div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="question-actions"><button className="button button-ghost" type="button" onClick={() => setCurrent((index) => Math.max(0, index - 1))} disabled={current === 0}><ArrowLeft size={17} /> 上一题</button>{current === visibleQuestions.length - 1 ? <button className="button button-primary" type="button" onClick={submitStage} disabled={!answers[question.id]}><CheckCircle2 size={17} /> {stageEvaluation.status === "failed" ? "结束测评" : activeLevel === 8 && stageEvaluation.status === "passed" ? "完成测评" : "提交本关"}</button> : <button className="button button-primary" type="button" onClick={() => answers[question.id] && setCurrent((index) => index + 1)} disabled={!answers[question.id]}>下一题<ArrowRight size={17} /></button>}</div>
        <p className="assessment-footnote"><LockKeyhole size={14} /> 每个等级固定 5 道题，题目从本等级题库随机抽取。提交前可以返回修改。</p>
      </section>
    </main>
  );
}

export function StageAdvance({ level, onContinue }: { level: number; onContinue: () => void }) {
  const grade = getGrade(level);
  const confetti = Array.from({ length: 10 });
  return <main className="welcome-page page-width"><section className="welcome-card is-verified stage-advance-card" role="status" aria-live="polite"><div className="stage-advance-celebration" aria-hidden="true"><div className="stage-advance-burst"><Trophy size={30} /><Sparkles size={17} /></div>{confetti.map((_, index) => <span className="stage-advance-confetti" key={index} style={{ "--confetti-angle": `${index * 36}deg`, "--confetti-delay": `${index * 45}ms` } as React.CSSProperties} />)}</div><div className="verified-line"><CheckCircle2 size={17} /> L{level} 已通过</div><span className="eyebrow">STAGE CLEARED</span><h1>恭喜你达到 L{level} · {grade.name}</h1><p className="welcome-lead">本关表现已达标，继续挑战下一关。最终等级会在全部测评结束后统一生成。</p><button className="button button-primary button-wide" type="button" onClick={onContinue}>继续闯关 L{level + 1}<ArrowRight size={18} /></button></section></main>;
}

function IdentityGate({ token, onVerified }: { token: string; onVerified: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const verify = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await assessmentRepository.authenticateParticipant(token, name);
      if (!assessmentRepository.verifyParticipantName(token, name)) {
        setError("未找到该姓名，请联系管理员。" );
        return;
      }
      await assessmentRepository.flush();
      onVerified();
    } catch (identityError) {
      await assessmentRepository.initialize().catch(() => undefined);
      setError(identityError instanceof Error ? identityError.message : "系统暂时无法保存数据，请稍后重试。" );
    }
  };

  return <main className="identity-page page-width"><header className="assessment-header"><Link to="/" className="brand-lockup"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>身份核验</small></span></Link><span className="assessment-person"><LockKeyhole size={14} /> 姓名验证</span></header><section className="identity-gate"><div className="identity-emblem"><UserRound size={26} /><span><ShieldCheck size={14} /></span></div><span className="eyebrow">IDENTITY CHECK</span><h1>请输入姓名</h1><p>输入管理员登记的姓名，确认后即可进入测评。</p><form onSubmit={verify}><label htmlFor="employee-name">姓名</label><input id="employee-name" autoComplete="name" autoFocus maxLength={60} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="请输入姓名" />{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-wide" type="submit" disabled={!name.trim()}>确认并进入<ArrowRight size={17} /></button></form><div className="identity-security"><LockKeyhole size={14} /> 系统仅核验姓名，不会自动创建未登记人员</div></section></main>;
}

function AssessmentWelcome({ participant, questionCount, resetRequired, onStart }: { participant: Participant; questionCount: number; resetRequired: boolean; onStart: () => void }) {
  return <main className="welcome-page page-width"><header className="assessment-header"><Link to="/" className="brand-lockup"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>员工测评</small></span></Link><span className="assessment-person"><ShieldCheck size={14} /> 身份已匹配</span></header><section className="welcome-card is-verified"><div className="verified-line"><CheckCircle2 size={17} /> 姓名核验成功</div><span className="eyebrow">PERSONAL GROWTH ASSESSMENT</span><h1>你好，{participant.name}</h1><p className="welcome-lead">这份测评关注你在真实工作情境中的取舍，系统会从 L1 开始，根据每关表现决定是否继续挑战。</p>{resetRequired && <p className="form-error" role="alert">题库已升级，上一份未完成草稿需要重新开始。</p>}<div className="welcome-info"><div><Clock3 size={18} /><span><strong>约 3–12 分钟</strong><small>每关 {questionCount} 道工作情境题</small></span></div><div><LockKeyhole size={18} /><span><strong>最多 8 个等级</strong><small>首次未通过即结束</small></span></div><div><RotateCcw size={18} /><span><strong>可返回修改</strong><small>每关提交前答案都可调整</small></span></div></div><div className="identity-line"><span>部门</span><strong>{participant.department}</strong><span>岗位</span><strong>{participant.position}</strong></div><button className="button button-primary button-wide" type="button" onClick={onStart}>开始 L1 测评<ArrowRight size={18} /></button></section></main>;
}

function InvalidLink({ message = "这条测评链接无效或已失效。" }: { message?: string }) {
  return <main className="empty-state page-width"><div className="empty-state-icon"><LockKeyhole size={26} /></div><h1>无法打开测评</h1><p>{message}</p><Link to="/" className="button button-primary">返回首页</Link></main>;
}
