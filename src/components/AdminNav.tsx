import { BarChart3, ClipboardList, Download, FileQuestion, LayoutDashboard, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/admin", label: "概览", icon: LayoutDashboard, end: true },
  { to: "/admin/campaigns", label: "测评批次", icon: ClipboardList },
  { to: "/admin/people", label: "人员名单", icon: UsersRound },
  { to: "/admin/results", label: "结果明细", icon: BarChart3 },
  { to: "/admin/question-bank", label: "题库与规则", icon: FileQuestion },
  { to: "/admin/exports", label: "数据导出", icon: Download }
];

export default function AdminNav() {
  return <aside className="admin-sidebar"><NavLink to="/admin" className="admin-brand"><span className="brand-mark">AI</span><span><strong>AI 能力认证</strong><small>管理工作台</small></span></NavLink><nav className="admin-nav" aria-label="管理员导航">{items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `admin-nav-link ${isActive ? "is-active" : ""}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav><div className="admin-sidebar-note"><span className="status-dot" />本地演示数据已保存</div></aside>;
}
