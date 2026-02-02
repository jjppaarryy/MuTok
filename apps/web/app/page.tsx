"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import DailyHighlightsCard from "../components/dashboard/DailyHighlightsCard";
import DailyStudioHero from "../components/dashboard/DailyStudioHero";
import HealthCheckCard from "../components/dashboard/HealthCheckCard";
import SetupChecklistCard from "../components/dashboard/SetupChecklistCard";
import StudioStatsGrid from "../components/dashboard/StudioStatsGrid";
import SupplyCheckCard from "../components/dashboard/SupplyCheckCard";
import { SNIPPET_LABELS } from "../components/recipes/recipeTypes";

type Health = {
  clipCount: number;
  trackCount: number;
  approvedSnippets: number;
  draftCount: number;
  pendingCount?: number;
  dailyUploads?: number;
  authConnected?: boolean;
  authExpiresAt?: string | null;
  recovery?: { active: boolean; spamErrors: number };
};

type Coverage = {
  activeRecipes: number;
  requiredRecipes: number;
  shortfall: number;
};

type NextStep = { label: string; href: string; reason: string };
type ChecklistItem = { label: string; href: string; done: boolean };
type Highlights = { winnerHook?: string | null; snippetTrend?: string | null };

export default function DashboardPage() {
  const [health, setHealth] = useState<Health>({
    clipCount: 0,
    trackCount: 0,
    approvedSnippets: 0,
    draftCount: 0,
    pendingCount: 0,
    dailyUploads: 0,
    authConnected: false,
    authExpiresAt: null
  });
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [retireCount, setRetireCount] = useState<number>(0);
  const [nextRun, setNextRun] = useState<string>("—");
  const [cadencePerDay, setCadencePerDay] = useState<number>(3);
  const [montageClipCount, setMontageClipCount] = useState<number>(6);
  const [montageAllowed, setMontageAllowed] = useState<boolean>(false);
  const [highlights, setHighlights] = useState<Highlights | null>(null);
  const [checklistCollapsed, setChecklistCollapsed] = useState<boolean>(false);

  const loadHealth = async () => {
    const response = await fetch("/api/dashboard/health");
    const data = (await response.json()) as Health;
    setHealth(data);
  };

  const loadNextRun = async () => {
    const response = await fetch("/api/settings");
    const data = (await response.json()) as {
      rules: {
        post_time_windows: string[];
        cadence_per_day?: number;
        allowed_containers?: string[];
        montage?: { clip_count?: number; clip_count_min?: number; clip_count_max?: number };
        spam_guardrails?: { window_jitter_minutes?: number };
      };
    };
    const windows = data.rules.post_time_windows ?? [];
    const jitter = data.rules.spam_guardrails?.window_jitter_minutes ?? 0;
    setCadencePerDay(data.rules.cadence_per_day ?? 3);
    setMontageAllowed((data.rules.allowed_containers ?? []).includes("montage"));
    const m = data.rules.montage;
    const min = m?.clip_count_min ?? m?.clip_count ?? 6;
    const max = m?.clip_count_max ?? m?.clip_count ?? 6;
    setMontageClipCount(Math.round((min + max) / 2));
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
        recipeLeaderboard?: Array<{ recipe: string; score: number; count: number }>;
        snippetLeaderboard?: Array<{ snippetStrategy: string; score: number; count: number }>;
      };
      setCoverage(data.coverage ?? null);
      setRetireCount(data.notifications?.retireCandidates?.length ?? 0);
      const winnerHook = data.recipeLeaderboard?.[0]?.recipe ?? null;
      const topSnippet = data.snippetLeaderboard?.[0]?.snippetStrategy ?? null;
      const snippetTrend =
        topSnippet && topSnippet !== "any"
          ? SNIPPET_LABELS[topSnippet] ?? topSnippet
          : topSnippet === "any"
            ? "Any snippet"
            : null;
      setHighlights({ winnerHook, snippetTrend });
    } catch {
      setCoverage(null);
      setRetireCount(0);
      setHighlights(null);
    }
  };

  useEffect(() => {
    void loadHealth();
    void loadNextRun();
    void loadCoverage();
  }, []);

  const draftActionLabel =
    cadencePerDay === 1 ? "Generate today’s draft" : "Generate today’s drafts";

  const nextSteps = useMemo<NextStep[]>(() => {
    const steps: NextStep[] = [];
    if (!health.authConnected) {
      steps.push({ label: "Connect TikTok", href: "/connect", reason: "Required to upload drafts." });
    }
    if (health.clipCount === 0 || health.trackCount === 0) {
      steps.push({ label: "Add clips & tracks", href: "/assets", reason: "Needed to build new drafts." });
    }
    if (health.approvedSnippets === 0) {
      steps.push({ label: "Approve snippets", href: "/assets", reason: "Snippets fuel the planner." });
    }
    if ((coverage?.shortfall ?? 0) > 0) {
      steps.push({ label: "Add hooks", href: "/recipes", reason: "You need more hooks to stay consistent." });
    }
    if (health.draftCount === 0) {
      steps.push({ label: draftActionLabel, href: "/plan", reason: "Fill the queue so you can post." });
    }
    if (steps.length === 0) {
      steps.push({ label: "Review queue", href: "/queue", reason: "You’re ready to post." });
    }
    return steps.slice(0, 4);
  }, [coverage?.shortfall, draftActionLabel, health]);

  const weeklyTarget = Math.max(1, cadencePerDay * 7);
  const hooksTarget = coverage?.requiredRecipes ?? 0;
  const snippetsTarget = weeklyTarget;
  const montageRatio = montageAllowed ? 1 / 3 : 0;
  const avgClipsPerPost = montageAllowed
    ? (1 - montageRatio) * 1 + montageRatio * Math.max(1, montageClipCount)
    : 1;
  const clipsTarget = Math.ceil(weeklyTarget * avgClipsPerPost);

  const checklist = useMemo<ChecklistItem[]>(() => {
    return [
      { label: "Connect TikTok", href: "/connect", done: Boolean(health.authConnected) },
      { label: "Upload clips + tracks", href: "/assets", done: health.clipCount > 0 && health.trackCount > 0 },
      { label: "Approve snippets", href: "/assets", done: health.approvedSnippets > 0 },
      { label: "Create hooks", href: "/recipes", done: (coverage?.activeRecipes ?? 0) > 0 },
      { label: "Generate today’s drafts", href: "/plan", done: health.draftCount > 0 }
    ];
  }, [coverage?.activeRecipes, health]);

  const allChecklistDone = useMemo(
    () => checklist.every((item) => item.done),
    [checklist]
  );

  useEffect(() => {
    if (allChecklistDone) {
      setChecklistCollapsed(true);
    }
  }, [allChecklistDone]);

  const readinessMissing = useMemo(() => {
    const missing: string[] = [];
    if (!health.authConnected) missing.push("Connect TikTok");
    if (health.clipCount === 0) missing.push("Add clips");
    if (health.trackCount === 0) missing.push("Add tracks");
    if (health.approvedSnippets === 0) missing.push("Approve snippets");
    if ((coverage?.shortfall ?? 0) > 0) missing.push(`${coverage?.shortfall} hooks`);
    if (health.draftCount === 0) missing.push(draftActionLabel);
    return missing;
  }, [coverage?.shortfall, draftActionLabel, health]);

  const readinessText =
    readinessMissing.length === 0
      ? "Ready to post today."
      : `Missing: ${readinessMissing.slice(0, 3).join(", ")}${readinessMissing.length > 3 ? "…" : ""}`;

  const primaryActionLabel = `Generate today’s ${cadencePerDay} draft${cadencePerDay === 1 ? "" : "s"}`;
  const nextAction = nextSteps[0];

  const handleTopUp = async () => {
    await fetch("/api/queue/topup", { method: "POST" });
    await loadHealth();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <PageHeader
        title="Daily Studio"
        description="Your single place to prepare today’s drafts."
      />

      <DailyStudioHero
        readinessText={readinessText}
        readinessTone={readinessMissing.length === 0 ? "ready" : "missing"}
        nextRun={nextRun}
        primaryActionLabel={primaryActionLabel}
        onPrimaryAction={handleTopUp}
        nextAction={nextAction}
      />

      <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
        <SetupChecklistCard
          checklist={checklist}
          collapsed={checklistCollapsed}
          onToggle={() => setChecklistCollapsed((prev) => !prev)}
        />
        <DailyHighlightsCard highlights={highlights} />
      </section>

      <StudioStatsGrid
        draftCount={health.draftCount}
        nextRun={nextRun}
        activeHooks={coverage?.activeRecipes ?? 0}
        hooksShortfall={coverage?.shortfall ?? 0}
        approvedSnippets={health.approvedSnippets}
        clipCount={health.clipCount}
        trackCount={health.trackCount}
      />

      <SupplyCheckCard
        hooksTarget={hooksTarget || weeklyTarget}
        hooksValue={coverage?.activeRecipes ?? 0}
        snippetsTarget={snippetsTarget}
        snippetsValue={health.approvedSnippets}
        clipsTarget={clipsTarget}
        clipsValue={health.clipCount}
        montageAllowed={montageAllowed}
        avgClipsPerPost={avgClipsPerPost}
      />

      <HealthCheckCard
        authConnected={health.authConnected}
        authExpiresAt={health.authExpiresAt}
        recoveryActive={health.recovery?.active}
        spamErrors={health.recovery?.spamErrors}
        retireCount={retireCount}
      />
    </div>
  );
}
