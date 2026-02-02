"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import LeaderboardCard from "../../components/analytics/LeaderboardCard";
import RecipeSuggestions from "../../components/analytics/RecipeSuggestions";
import ManualMappingCard from "../../components/analytics/ManualMappingCard";

type MetricsSummary = {
  totals: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  recipeLeaderboard: { recipe: string; score: number; count: number }[];
  containerLeaderboard: { container: string; score: number; count: number }[];
  snippetLeaderboard: { snippetStrategy: string; score: number; count: number }[];
  clipCategoryLeaderboard: { clipCategory: string; score: number; count: number }[];
  pairingLeaderboard: { pairing: string; score: number; count: number }[];
  coverage: {
    activeRecipes: number;
    requiredRecipes: number;
    shortfall: number;
    cadencePerDay: number;
    cooldownDays: number;
  };
};

type PostPlan = {
  id: string;
  caption: string;
  status: string;
};

const cardStyle: React.CSSProperties = {
  padding: 32,
  borderRadius: 20,
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  gap: 16
};


export default function AnalyticsPage() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [plans, setPlans] = useState<PostPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [videoId, setVideoId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showManualMapping, setShowManualMapping] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const loadSummary = async () => {
    try {
      const response = await fetch("/api/analytics/summary");
      if (!response.ok) {
        setSummary(null);
        return;
      }
      const text = await response.text();
      if (!text) {
        setSummary(null);
        return;
      }
      const data = JSON.parse(text) as MetricsSummary;
      setSummary(data);
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await fetch("/api/queue");
      if (!response.ok) throw new Error("Failed to load plans");
      const data = (await response.json()) as { plans: PostPlan[] };
      setPlans(data.plans ?? []);
    } catch (err) {
      console.error("Failed to load plans:", err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadSummary(), loadPlans()]);
      setLoading(false);
    };
    void loadAll();
  }, []);

  const refreshMetrics = async () => {
    setMessage(null);
    setError(null);
    setRefreshing(true);
    try {
      const response = await fetch("/api/metrics/refresh", { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Refresh failed");
      }
      await loadSummary();
      setMessage("Metrics refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh metrics");
    } finally {
      setRefreshing(false);
    }
  };

  const markPosted = async () => {
    if (!selectedPlan) {
      setError("Please select a post plan");
      return;
    }
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/queue/mark-posted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postPlanId: selectedPlan, tiktokVideoId: videoId })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to mark as posted");
      }
      setMessage("Post marked as published.");
      setSelectedPlan("");
      setVideoId("");
      setShowManualMapping(false);
      await loadSummary();
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as posted");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <div style={{ fontSize: 18, color: "#64748b" }}>Loading learnings...</div>
      </div>
    );
  }

  const totalSignals =
    (summary?.totals.views ?? 0) +
    (summary?.totals.likes ?? 0) +
    (summary?.totals.comments ?? 0) +
    (summary?.totals.shares ?? 0);
  const hasResults = totalSignals > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <PageHeader
        title="Learn"
        description="See what’s working and what to try next."
        actions={
          <div style={{ display: "flex", gap: 12 }}>
            <ActionButton
              label={refreshing ? "Refreshing..." : "Refresh metrics"}
              onClick={refreshMetrics}
              title="Get the latest TikTok stats."
              disabled={refreshing}
            />
            <ActionButton
              label={showManualMapping ? "Hide manual mapping" : "Manual mark as posted"}
              variant="ghost"
              onClick={() => setShowManualMapping(!showManualMapping)}
              title="Link a TikTok video to a plan."
            />
            <ActionButton
              label={showDetails ? "Hide details" : "Show details"}
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
            />
          </div>
        }
      />

      {error && (
        <div style={{ padding: 16, borderRadius: 12, border: "1px solid #fecaca", backgroundColor: "#fef2f2", color: "#dc2626" }}>
          {error}
        </div>
      )}
      {message && !error && (
        <div style={{ padding: 16, borderRadius: 12, border: "1px solid #a7f3d0", backgroundColor: "#f0fdf4", color: "#059669" }}>
          {message}
        </div>
      )}

      {!hasResults && (
        <div style={{ padding: 16, borderRadius: 12, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569" }}>
          No results yet. Post on TikTok, then refresh metrics here.
        </div>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard title="Views" value={summary ? String(summary.totals.views) : "—"} />
        <StatCard title="Likes" value={summary ? String(summary.totals.likes) : "—"} />
        <StatCard title="Comments" value={summary ? String(summary.totals.comments) : "—"} />
        <StatCard title="Shares" value={summary ? String(summary.totals.shares) : "—"} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        <LeaderboardCard
          title="Top hooks"
          rows={(summary?.recipeLeaderboard ?? []).map((row) => ({
            label: row.recipe,
            score: row.score,
            count: row.count
          }))}
          emptyText="No hook performance yet."
        />
        <LeaderboardCard
          title="Top containers"
          rows={(summary?.containerLeaderboard ?? []).map((row) => ({
            label: row.container,
            score: row.score,
            count: row.count
          }))}
          emptyText="No container data yet."
        />
      </section>

      <section style={cardStyle}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Coverage</div>
        <div style={{ color: "#64748b" }}>
          {summary ? (
            <>
              {summary.coverage.shortfall > 0
                ? `You need ${summary.coverage.shortfall} more active hooks for ${summary.coverage.cadencePerDay}/day.`
                : "Your hook library is on track for the week."}
            </>
          ) : (
            "No coverage data yet."
          )}
        </div>
      </section>

      {showDetails && (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
            <LeaderboardCard
              title="Snippet strategies"
              rows={(summary?.snippetLeaderboard ?? []).map((row) => ({
                label: row.snippetStrategy,
                score: row.score,
                count: row.count
              }))}
              emptyText="No snippet data yet."
            />
            <LeaderboardCard
              title="Clip categories"
              rows={(summary?.clipCategoryLeaderboard ?? []).map((row) => ({
                label: row.clipCategory,
                score: row.score,
                count: row.count
              }))}
              emptyText="No clip category data yet."
            />
          </section>

          <LeaderboardCard
            title="Hook + snippet pairings"
            rows={(summary?.pairingLeaderboard ?? []).map((row) => ({
              label: row.pairing,
              score: row.score,
              count: row.count
            }))}
            emptyText="No pairing data yet."
          />

          <RecipeSuggestions />
        </>
      )}

      {showManualMapping && (
        <ManualMappingCard
          plans={plans}
          selectedPlan={selectedPlan}
          videoId={videoId}
          onSelectPlan={setSelectedPlan}
          onVideoIdChange={setVideoId}
          onMark={markPosted}
        />
      )}
    </div>
  );
}
