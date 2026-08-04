import { ArrowRight, BarChart3, ClipboardCheck, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { assessmentRepository } from "../domain/store";

export default function HomePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const enterAssessment = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await assessmentRepository.refresh();
    } catch {
      setError("系统暂时无法读取数据，请稍后重试。");
      return;
    }
    const participant = assessmentRepository.findParticipantByName(name);
    if (!participant) {
      setError("未找到该姓名，请联系管理员。");
      return;
    }
    try {
      await assessmentRepository.authenticateParticipant(participant.token, name);
      assessmentRepository.verifyParticipantName(participant.token, name);
      await assessmentRepository.flush();
      sessionStorage.setItem(`assessment-identity:${participant.token}`, "verified");
      navigate(`/assessment/${participant.token}`);
    } catch (identityError) {
      await assessmentRepository.initialize().catch(() => undefined);
      setError(identityError instanceof Error ? identityError.message : "系统暂时无法保存数据，请稍后重试。");
    }
  };

  return (
    <main className="home-page">
      <header className="site-header page-width">
        <Link className="brand-lockup" to="/" aria-label="AI 能力认证首页"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>从会问 AI，到会建设 AI 生态</small></span></Link>
        <Link className="header-admin-link" to="/admin"><BarChart3 size={16} /> 管理员工作台</Link>
      </header>
      <section className="home-hero page-width">
        <div className="hero-copy">
          <span className="eyebrow">AI CAPABILITY ASSESSMENT · 2026</span>
          <h1>看清你真正的<br /><em>AI 能力阶段</em></h1>
          <p>一套 20 题的工作情景测评，判断你能否把 AI 用成结果、流程、应用与组织能力。</p>
          <form className="hero-name-form" onSubmit={enterAssessment}>
            <label htmlFor="home-employee-name">姓名</label>
            <div><input id="home-employee-name" autoComplete="name" maxLength={60} value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="请输入姓名" /><button className="button button-primary" type="submit" disabled={!name.trim()}><ClipboardCheck size={18} /> 进入测评 <ArrowRight size={17} /></button></div>
            {error && <p className="form-error" role="alert">{error}</p>}
          </form>
          <div className="hero-meta"><span><ShieldCheck size={16} /> 约 8–12 分钟</span><span><ShieldCheck size={16} /> 结果仅用于成长与培训诊断</span></div>
        </div>
        <div className="hero-tower" aria-label="八级 AI 能力塔">
          <div className="tower-label">能力进阶路径</div>
          {[8, 7, 6, 5, 4, 3, 2, 1].map((level) => {
            const grade = assessmentRepository.listCampaigns().length ? undefined : undefined;
            const labels = ["荣耀王者", "王者", "星耀", "钻石", "铂金", "黄金", "白银", "青铜"];
            return <div className={`tower-step tower-step-${level}`} key={level}><strong>L{level}</strong><span>{labels[8 - level]}</span><small>{["建设 AI 生态", "重构业务流程", "搭建 AI 应用", "连接 AI 工具", "训练 AI 流程", "寻找 AI 场景", "AI 办公", "问 AI"][8 - level]}</small></div>;
          })}
        </div>
      </section>
      <section className="home-principles page-width"><div><span className="section-index">01</span><strong>行为情景，而非自我感觉</strong><p>用最近一次真实做法拉开能力差异，减少“会不会”的主观高估。</p></div><div><span className="section-index">02</span><strong>连续计分，保留差异</strong><p>综合全部情景证据映射能力阶段，避免单题门槛造成结果堆积。</p></div><div><span className="section-index">03</span><strong>结果必须能行动</strong><p>每个等级都对应下一阶段的三个实践任务，测完就知道从哪里开始。</p></div></section>
    </main>
  );
}
