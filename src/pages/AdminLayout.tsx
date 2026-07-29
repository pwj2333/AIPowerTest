import { Bell, ChevronDown, LockKeyhole, LogOut, Menu, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import AdminNav from "../components/AdminNav";
import AdminOverviewPage from "./AdminOverviewPage";
import CampaignsPage from "./CampaignsPage";
import ExportsPage from "./ExportsPage";
import PeoplePage from "./PeoplePage";
import QuestionBankPage from "./QuestionBankPage";
import ResultsPage from "./ResultsPage";

export default function AdminLayout() {
  const [authentication, setAuthentication] = useState<"checking" | "signed-out" | "signed-in">(import.meta.env.MODE === "test" ? "signed-in" : "checking");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    fetch("/api/admin/session", { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((body: { authenticated?: boolean }) => setAuthentication(body.authenticated ? "signed-in" : "signed-out"))
      .catch(() => setAuthentication("signed-out"));
  }, []);
  if (authentication === "checking") return <main className="startup-error"><h1>正在验证管理员身份</h1><p>请稍候。</p></main>;
  if (authentication === "signed-out") return <AdminLogin onSignedIn={() => setAuthentication("signed-in")} />;
  const signOut = async () => { await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined); setAuthentication("signed-out"); };
  return <div className="admin-app">{mobileNavOpen && <div className="admin-nav-drawer is-open" onClick={() => setMobileNavOpen(false)}><div onClick={(event) => event.stopPropagation()}><AdminNav /></div></div>}<div className="admin-desktop-nav"><AdminNav /></div><div className="admin-content"><header className="admin-topbar"><button className="mobile-menu-button" type="button" onClick={() => setMobileNavOpen(true)} aria-label="打开导航"><Menu size={20} /></button><div className="admin-breadcrumb"><span>AI 能力认证</span><ChevronDown size={14} /><strong>管理工作台</strong></div><div className="admin-top-actions"><button className="topbar-icon" title="搜索"><Search size={17} /></button><button className="topbar-icon" title="通知"><Bell size={17} /></button><span className="admin-avatar">管</span><span className="admin-name">管理员</span><button className="topbar-icon" title="退出登录" type="button" onClick={signOut}><LogOut size={17} /></button></div></header><main className="admin-main"><Routes><Route index element={<AdminOverviewPage />} /><Route path="campaigns" element={<CampaignsPage />} /><Route path="people" element={<PeoplePage />} /><Route path="results" element={<ResultsPage />} /><Route path="question-bank" element={<QuestionBankPage />} /><Route path="exports" element={<ExportsPage />} /><Route path="*" element={<Navigate to="/admin" replace />} /></Routes></main></div></div>;
}

function AdminLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error || "登录失败，请稍后重试。");
      onSignedIn();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };
  return <main className="admin-login-page page-width"><header className="assessment-header"><Link to="/" className="brand-lockup"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>管理工作台</small></span></Link><span className="assessment-person"><LockKeyhole size={14} /> 管理员登录</span></header><section className="identity-gate"><div className="identity-emblem"><LockKeyhole size={26} /></div><span className="eyebrow">ADMIN ACCESS</span><h1>管理员登录</h1><p>请输入管理员密码进入管理工作台。</p><form onSubmit={submit}><label htmlFor="admin-password">管理员密码</label><input id="admin-password" type="password" autoComplete="current-password" autoFocus maxLength={256} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="请输入密码" />{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-wide" type="submit" disabled={!password || submitting}>{submitting ? "正在登录..." : "登录"}</button></form></section></main>;
}
