"use client";

import { useEffect, useState } from "react";
import ActionButton from "../components/ActionButton";
import InlineTip from "../components/InlineTip";
import StatCard from "../components/StatCard";

type Health = {
  clipCount: number;
  trackCount: number;
  approvedSnippets: number;
  draftCount: number;
  pendingCount?: number;
  dailyUploads?: number;
  authConnected?: boolean;
  authExpiresAt?: string | null;
  scheduler?: { running: boolean; hasTask: boolean };
  uploadCooldownUntil?: string | Date | null;
  recovery?: { active: boolean; viewsDrop: number; view2sDrop: number; spamErrors: number };
};

type Coverage = {
  activeRecipes: number;
  requiredRecipes: number;
  shortfall: number;
  cadencePerDay: number;
  cooldownDays: number;
};

export default function DashboardPage() {
  const styles = {
    container: {},
    header: {},
    headerTitle: {
      fontSize: 42,
      fontWeight: 800,
      letterSpacing: -1,
      lineHeight: 1.1,
      marginBottom: 12
    },
    headerSubtitle: { fontSize: 17, maxWidth: 600 },
    headerActions: {},
    section: { padding: 48, borderRadius: 24 },
    sectionHeader: {},
    sectionHeaderStack: {},
    sectionTitle: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
    sectionSubtitle: { fontSize: 16 },
    sectionBadge: {
      padding: "10px 20px",
      borderRadius: 20,
      fontSize: 14,
      fontWeight: 600
    },
    queueGrid: {},
    healthGrid: {},
    healthCard: { padding: 32, borderRadius: 20 },
    healthLabel: {
      fontSize: 13,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 0.5
    },
    healthValue: { fontSize: 32, fontWeight: 700, marginTop: 12 },
    healthHint: { fontSize: 14, marginTop: 8 },
    sectionStack: {},
    alertCard: { padding: 24, borderRadius: 16, fontSize: 16, fontWeight: 500 },
    infoCard: { padding: 24, borderRadius: 16, fontSize: 16 }
  } as const;

  const [health, setHealth] = useState<Health>({
    clipCount: 0,
    trackCount: 0,
    approvedSnippets: 0,
    draftCount: 0,
    pendingCount: 0,
    dailyUploads: 0,
    authConnected: false,
    authExpiresAt: null,
    scheduler: { running: false, hasTask: false }
  });
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [retireCount, setRetireCount] = useState<number>(0);
  const [nextRun, setNextRun] = useState<string>("—");

  const loadHealth = async () => {
    const response = await fetch("/api/dashboard/health");
    const data = (await response.json()) as Health;
    setHealth(data);
  };

  const loadNextRun = async () => {
    const response = await fetch("/api/settings");
    const data = (await response.json()) as {
      rules: { post_time_windows: string[]; spam_guardrails?: { window_jitter_minutes?: number } };
    };
    const windows = data.rules.post_time_windows ?? [];
    const jitter = data.rules.spam_guardrails?.window_jitter_minutes ?? 0;
    const now = new Date();
    const candidates = windows
      .map((time) => {
        const [start] = time.split("-");
        const [hour, minute] = start.split(":").map(Number);
        const next = new Date(now);
        next.setHours(hour, minute, 0, 0);
        if (jitter > 0) {
          next.setMinutes(next.getMinutes() + Math.min(jitter, 30));
        }
        return next;
      })
      .sort((a, b) => a.getTime() - b.getTime());
    const nextSameDay = candidates.find((candidate) => candidate > now);
    const next =
      nextSameDay ?? (candidates[0] ? new Date(candidates[0].getTime() + 24 * 60 * 60 * 1000) : now);
    setNextRun(next.toLocaleString());
  };

  const loadCoverage = async () => {
    try {
      const response = await fetch("/api/analytics/summary");
      if (!response.ok) {
        setCoverage(null);
        setRetireCount(0);
        return;
      }
      const text = await response.text();
      if (!text) {
        setCoverage(null);
        setRetireCount(0);
        return;
      }
      const data = JSON.parse(text) as {
        coverage?: Coverage;
        notifications?: { retireCandidates?: Array<{ recipeId: string }> };
      };
      setCoverage(data.coverage ?? null);
      setRetireCount(data.notifications?.retireCandidates?.length ?? 0);
    } catch {
      setCoverage(null);
      setRetireCount(0);
    }
  };

  useEffect(() => {
    void loadHealth();
    void loadNextRun();
    void loadCoverage();
  }, []);

  const topUpDrafts = async () => {
    await fetch("/api/queue/topup", { method: "POST" });
    await loadHealth();
  };

  const generateNext = async () => {
    await fetch("/api/queue/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 2, dryRun: true })
    });
    await loadHealth();
  };

  return (
    <div style={styles.container} className="dash-stack">
      {/* Header */}
      <header style={styles.header} className="dash-header">
        <div>
          <h1 style={styles.headerTitle} className="dash-title text-slate-900">
            Dashboard
          </h1>
          <p style={styles.headerSubtitle} className="dash-subtitle text-slate-600">
            Queue readiness, scheduler status, and what to do next.
          </p>
        </div>
        <div style={styles.headerActions} className="dash-actions">
          <ActionButton
            label="Top up drafts"
            onClick={topUpDrafts}
            title="Make new plans to fill the queue."
          />
          <ActionButton
            label="Generate next"
            variant="secondary"
            onClick={generateNext}
            title="Preview a couple of plans without rendering."
          />
        </div>
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748b" }}>
        Order: Connect → Add clips/tracks → Approve snippets → Set rules → Queue drafts
        <InlineTip text="You can still do everything manually if you want. The AI just speeds it up." />
      </div>

      {/* Queue Overview Section */}
      <section style={styles.section} className="panel">
        <div style={styles.sectionHeader} className="dash-section-header">
          <div style={styles.sectionHeaderStack} className="dash-section-stack">
            <h2 style={styles.sectionTitle} className="dash-section-title text-slate-900">Queue overview</h2>
            <p style={styles.sectionSubtitle} className="dash-section-subtitle text-slate-600">Live counters and the next scheduled push.</p>
          </div>
          <span style={styles.sectionBadge} className="bg-slate-100 text-slate-600">
            Live
          </span>
        </div>
        <div style={styles.queueGrid} className="dash-grid-queue">
          <StatCard
            title="Drafts queued"
            value={String(health.draftCount)}
            hint={`Next run: ${nextRun}`}
          />
          <StatCard
            title="Pending share cap"
            value={`${health.pendingCount ?? 0}/5`}
            hint="24h window"
          />
          <StatCard
            title="Daily uploads"
            value={`${health.dailyUploads ?? 0}/3`}
            hint="Daily cap"
          />
          <StatCard title="Clips available" value={String(health.clipCount)} />
          <StatCard
            title="Approved snippets"
            value={String(health.approvedSnippets)}
          />
        </div>
      </section>


      {/* System Health Section */}
      <section style={styles.section} className="panel">
        <div style={styles.sectionHeader} className="dash-section-header">
          <div style={styles.sectionHeaderStack} className="dash-section-stack">
            <h2 style={styles.sectionTitle} className="dash-section-title text-slate-900">System health</h2>
            <p style={styles.sectionSubtitle} className="dash-section-subtitle text-slate-600">Auth, scheduler and cooldown signals.</p>
          </div>
          <span style={styles.sectionBadge} className="bg-slate-100 text-slate-600">
            Status
          </span>
        </div>
        <div style={styles.healthGrid} className="dash-grid-health">
          <div style={styles.healthCard} className="card">
            <div style={styles.healthLabel} className="text-slate-500">TikTok OAuth</div>
            <div style={styles.healthValue} className="text-slate-900">
              {health.authConnected ? "Connected" : "Disconnected"}
            </div>
            <div style={styles.healthHint} className="text-slate-500">
              {health.authExpiresAt
                ? `Expires: ${new Date(health.authExpiresAt).toLocaleString()}`
                : "No token"}
            </div>
          </div>
          <div style={styles.healthCard} className="card">
            <div style={styles.healthLabel} className="text-slate-500">Scheduler</div>
            <div style={styles.healthValue} className="text-slate-900">
              {health.scheduler?.running ? "Running" : "Stopped"}
            </div>
            <div style={styles.healthHint} className="text-slate-500">
              {health.scheduler?.hasTask ? "Cron active" : "No task"}
            </div>
          </div>
          <div style={styles.healthCard} className="card">
            <div style={styles.healthLabel} className="text-slate-500">Upload cooldown</div>
            <div style={styles.healthValue} className="text-slate-900">
              {health.uploadCooldownUntil ? "Active" : "None"}
            </div>
            <div style={styles.healthHint} className="text-slate-500">
              {health.uploadCooldownUntil
                ? new Date(health.uploadCooldownUntil).toLocaleString()
                : "No cooldown"}
            </div>
          </div>
        </div>
      </section>

      {/* Alerts Section */}
      <section style={styles.section} className="panel">
        <div style={{ marginBottom: 32 }}>
          <h2 style={styles.sectionTitle} className="dash-section-title text-slate-900">Alerts</h2>
          <p style={styles.sectionSubtitle} className="dash-section-subtitle text-slate-600">Things to fix before your next run.</p>
        </div>
        <div style={styles.sectionStack} className="dash-stack-16">
          {(health.clipCount === 0 || health.trackCount === 0) && (
            <div style={styles.alertCard} className="card text-warning">
              Missing assets. Upload clips and tracks before generating plans.
            </div>
          )}
          {health.approvedSnippets === 0 && (
            <div style={styles.alertCard} className="card text-warning">
              No approved snippets. Generate snippets and approve at least one.
            </div>
          )}
          {health.pendingCount && health.pendingCount >= 4 ? (
            <div style={styles.alertCard} className="card text-warning">
              Pending share cap approaching ({health.pendingCount}/5).
            </div>
          ) : (
            <div style={styles.infoCard} className="card text-slate-600">
              No critical alerts right now.
            </div>
          )}
          {coverage && coverage.shortfall > 0 ? (
            <div style={styles.alertCard} className="card text-warning">
              You need {coverage.shortfall} more active recipes for {coverage.cadencePerDay}/day.
            </div>
          ) : null}
          {retireCount > 0 ? (
            <div style={styles.alertCard} className="card text-warning">
              {retireCount} recipes are ready to retire.
            </div>
          ) : null}
          {health.recovery?.active ? (
            <div style={styles.alertCard} className="card text-warning">
              Recovery mode active: performance drop detected. Posting reduced.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
