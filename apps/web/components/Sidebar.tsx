"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Cpu,
  FileText,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  ListChecks,
  PlugZap,
  TrendingUp
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Connect TikTok", href: "/connect", icon: PlugZap },
  { label: "Asset Bank", href: "/assets", icon: FolderOpen },
  { label: "Guardrails", href: "/rules", icon: ListChecks },
  { label: "Recipes", href: "/recipes", icon: FileText },
  { label: "Optimisation Policy", href: "/viral", icon: Activity },
  { label: "Optimiser", href: "/optimizer", icon: TrendingUp },
  { label: "Queue", href: "/queue", icon: Gauge },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Run Logs", href: "/logs", icon: FileText },
  { label: "System Status", href: "/status", icon: Cpu }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const styles = {
    aside: { width: 280, padding: "32px 24px" },
    header: { marginBottom: 32 },
    brandRow: { display: "flex", alignItems: "center", gap: 16 },
    brandIcon: { width: 48, height: 48, borderRadius: 16 },
    brandName: { fontSize: 18, fontWeight: 700 },
    brandSubtitle: { fontSize: 14 },
    envCard: { padding: "16px 20px", borderRadius: 16, marginBottom: 32 },
    envRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    envLabel: { fontSize: 14, fontWeight: 500 },
    envPill: { padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
    nav: { display: "flex", flexDirection: "column", gap: 8, flex: 1 },
    navLink: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "14px 18px",
      borderRadius: 14,
      fontSize: 15,
      fontWeight: 600,
      transition: "all 0.15s"
    },
    footer: { paddingTop: 24, fontSize: 13 },
    footerRow: { display: "flex", alignItems: "center", gap: 10 },
    footerText: { fontWeight: 500 }
  } as const;

  const navContent = (
    <>
      <div style={styles.header}>
        <div style={styles.brandRow}>
          <div
            style={styles.brandIcon}
            className="grid place-items-center bg-slate-900"
          >
            <span style={styles.brandName} className="text-white">M</span>
          </div>
          <div>
            <div style={styles.brandName} className="text-slate-900">
              MuTok
            </div>
            <div style={styles.brandSubtitle} className="text-slate-500">TikTok Growth Agent</div>
          </div>
        </div>
      </div>

      <div
        style={styles.envCard}
        className="border border-slate-200 bg-slate-50"
      >
        <div style={styles.envRow}>
          <span style={styles.envLabel} className="text-slate-600">Environment</span>
          <span
            style={styles.envPill}
            className="bg-white text-slate-700 ring-1 ring-slate-200"
          >
            Local
          </span>
        </div>
      </div>

      <nav style={styles.nav}>
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={styles.navLink}
              className={active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}
              onClick={() => setIsOpen(false)}
            >
              <Icon size={22} className={active ? "text-white" : "text-slate-400"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={styles.footer} className="text-slate-400">
        <div style={styles.footerRow}>
          <Activity size={16} />
          <span style={styles.footerText}>v0.1 • MVP</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        className="sidebar-burger"
        type="button"
        aria-label="Open navigation"
        onClick={() => setIsOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`sidebar-overlay ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        style={styles.aside}
        className="sidebar-desktop sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white"
      >
        {navContent}
      </aside>

      <aside
        style={styles.aside}
        className={`sidebar-drawer ${isOpen ? "open" : ""} flex h-full flex-col border-r border-slate-200 bg-white`}
      >
        {navContent}
      </aside>
    </>
  );
}
