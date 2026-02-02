"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  ClipboardList,
  Cpu,
  FileText,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Menu,
  PlugZap,
  TrendingUp
} from "lucide-react";

const navSections = [
  {
    title: "Core",
    items: [
      { label: "Daily Studio", href: "/", icon: LayoutDashboard },
      { label: "Setup", href: "/setup", icon: PlugZap },
      { label: "Hooks", href: "/recipes", icon: FileText },
      { label: "Plan", href: "/plan", icon: ClipboardList },
      { label: "Queue", href: "/queue", icon: Gauge },
      { label: "Learn", href: "/analytics", icon: BarChart3 }
    ]
  },
  {
    title: "Advanced",
    items: [
      { label: "Safety & Schedule", href: "/rules", icon: ListChecks },
      { label: "Testing", href: "/viral", icon: TrendingUp },
      { label: "Performance Overview", href: "/optimizer", icon: Activity },
      { label: "Run Logs", href: "/logs", icon: FileText },
      { label: "System", href: "/status", icon: Cpu }
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const styles = {
    aside: { width: 280, padding: "32px 24px", minHeight: "100vh", overflowY: "auto" },
    header: { marginBottom: 32 },
    brandRow: { display: "flex", alignItems: "center", gap: 16 },
    brandIcon: { width: 48, height: 48, borderRadius: 16 },
    brandName: { fontSize: 18, fontWeight: 700 },
    brandSubtitle: { fontSize: 14 },
    envCard: { padding: "16px 20px", borderRadius: 16, marginBottom: 32 },
    envRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
    envLabel: { fontSize: 14, fontWeight: 500 },
    envPill: { padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
    nav: { display: "flex", flexDirection: "column", gap: 16, flex: 1 },
    navGroup: { display: "flex", flexDirection: "column", gap: 8 },
    navTitle: {
      fontSize: 12,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: "#94a3b8",
      padding: "0 8px"
    },
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
    navLinkActive: {
      backgroundColor: "#0f172a",
      color: "white"
    },
    navLinkInactive: {
      color: "#475569"
    },
    footer: { paddingTop: 24, fontSize: 13 },
    footerRow: { display: "flex", alignItems: "center", gap: 10 },
    footerText: { fontWeight: 500 }
  } as const;

  const navContent = (
    <>
      <div style={styles.header}>
        <div style={styles.brandRow}>
          <div style={styles.brandIcon}>
            <img
              src="/icon.png"
              alt="MuTok"
              style={{ width: "100%", height: "100%", borderRadius: 16, display: "block" }}
            />
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
        {navSections.map((section) => (
          <div key={section.title} style={styles.navGroup}>
            <div style={styles.navTitle}>{section.title}</div>
            {section.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    ...styles.navLink,
                    ...(active ? styles.navLinkActive : styles.navLinkInactive)
                  }}
                  className={active ? "" : "hover:bg-slate-100"}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon size={22} className={active ? "text-white" : "text-slate-400"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
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
        <Menu size={22} />
      </button>

      <div
        className={`sidebar-overlay ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        style={styles.aside}
        className="sidebar-desktop flex shrink-0 flex-col border-r border-slate-200 bg-white"
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
