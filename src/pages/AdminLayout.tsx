import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminNav from "../components/AdminNav";
import AdminOverviewPage from "./AdminOverviewPage";
import CampaignsPage from "./CampaignsPage";
import ExportsPage from "./ExportsPage";
import PeoplePage from "./PeoplePage";
import QuestionBankPage from "./QuestionBankPage";
import ResultsPage from "./ResultsPage";

export default function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return <div className="admin-app">{mobileNavOpen && <div className="admin-nav-drawer is-open" onClick={() => setMobileNavOpen(false)}><div onClick={(event) => event.stopPropagation()}><AdminNav /></div></div>}<div className="admin-desktop-nav"><AdminNav /></div><div className="admin-content"><header className="admin-topbar"><button className="mobile-menu-button" type="button" onClick={() => setMobileNavOpen(true)} aria-label="打开导航"><Menu size={20} /></button><div className="admin-breadcrumb"><span>AI 能力认证</span><ChevronDown size={14} /><strong>管理工作台</strong></div><div className="admin-top-actions"><button className="topbar-icon" title="搜索"><Search size={17} /></button><button className="topbar-icon" title="通知"><Bell size={17} /></button><span className="admin-avatar">管</span><span className="admin-name">管理员</span></div></header><main className="admin-main"><Routes><Route index element={<AdminOverviewPage />} /><Route path="campaigns" element={<CampaignsPage />} /><Route path="people" element={<PeoplePage />} /><Route path="results" element={<ResultsPage />} /><Route path="question-bank" element={<QuestionBankPage />} /><Route path="exports" element={<ExportsPage />} /><Route path="*" element={<Navigate to="/admin" replace />} /></Routes></main></div></div>;
}
