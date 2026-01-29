"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InlineTip from "../../components/InlineTip";
import StatCard from "../../components/StatCard";
import LeaderboardCard from "../../components/analytics/LeaderboardCard";
import RecipeSuggestions from "../../components/analytics/RecipeSuggestions";

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

const cardStyle: React.CSSProperties = { padding: 48, borderRadius: 24, backgroundColor: 'white', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', gap: 24 };
const inputStyle: React.CSSProperties = { marginTop: 12, width: '100%', borderRadius: 16, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '16px 20px', fontSize: 16, fontWeight: 500, color: '#0f172a', outline: 'none' };

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
    const loadAll = async () => { setLoading(true); await Promise.all([loadSummary(), loadPlans()]); setLoading(false); };
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ fontSize: 18, color: '#64748b' }}>Loading analytics...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <header>
        <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, marginBottom: 12, color: '#0f172a' }}>Analytics & Learning</h1>
        <p style={{ fontSize: 17, color: '#64748b' }}>
          Weekly learning and deterministic recipe performance.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, fontSize: 14, color: "#64748b" }}>
          Refresh after you post on TikTok.
          <InlineTip text="If a post doesn't match, use manual mapping below." />
        </div>
      </header>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <ActionButton
          label={refreshing ? "Refreshing..." : "Refresh metrics"}
          onClick={refreshMetrics}
          title="Get the latest TikTok stats (rate-limited)."
          disabled={refreshing}
        />
        <ActionButton
          label={showManualMapping ? "Hide manual mapping" : "Manual mark as posted"}
          variant="ghost"
          onClick={() => setShowManualMapping(!showManualMapping)}
          title="Link a TikTok video to a plan."
        />
      </section>
      {error && (
        <div style={{ padding: 20, borderRadius: 16, border: '1px solid #fecaca', backgroundColor: '#fef2f2', fontSize: 14, color: '#dc2626' }}>
          {error}
        </div>
      )}

      {message && !error && (
        <div style={{ padding: 20, borderRadius: 16, border: '1px solid #a7f3d0', backgroundColor: '#f0fdf4', fontSize: 14, color: '#059669' }}>
          {message}
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        <StatCard title="Views" value={summary ? String(summary.totals.views) : "—"} />
        <StatCard title="Likes" value={summary ? String(summary.totals.likes) : "—"} />
        <StatCard
          title="Comments"
          value={summary ? String(summary.totals.comments) : "—"}
        />
        <StatCard title="Shares" value={summary ? String(summary.totals.shares) : "—"} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Coverage</h2>
          <div style={{ fontSize: 16, color: '#475569', lineHeight: 1.6 }}>
            {summary ? (
              <>
                <div>Active recipes: {summary.coverage.activeRecipes}</div>
                <div>Required recipes: {summary.coverage.requiredRecipes}</div>
                <div>Shortfall: {summary.coverage.shortfall}</div>
                <div>Cadence: {summary.coverage.cadencePerDay}/day</div>
                <div>Cooldown: {summary.coverage.cooldownDays} days</div>
              </>
            ) : (
              <div>No coverage data yet.</div>
            )}
          </div>
        </div>

        <LeaderboardCard
          title="Recipe Leaderboard"
          rows={(summary?.recipeLeaderboard ?? []).map((row) => ({
            label: row.recipe,
            score: row.score,
            count: row.count
          }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
        <LeaderboardCard
          title="Container Performance"
          rows={(summary?.containerLeaderboard ?? []).map((row) => ({
            label: row.container,
            score: row.score,
            count: row.count
          }))}
        />
        <LeaderboardCard
          title="Snippet Strategy"
          rows={(summary?.snippetLeaderboard ?? []).map((row) => ({
            label: row.snippetStrategy,
            score: row.score,
            count: row.count
          }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
        <LeaderboardCard
          title="Clip Category"
          rows={(summary?.clipCategoryLeaderboard ?? []).map((row) => ({
            label: row.clipCategory,
            score: row.score,
            count: row.count
          }))}
        />
        <LeaderboardCard
          title="Recipe + Container"
          rows={(summary?.pairingLeaderboard ?? []).map((row) => ({
            label: row.pairing,
            score: row.score,
            count: row.count
          }))}
        />
      </div>

      <RecipeSuggestions />

      {showManualMapping && (
        <section style={cardStyle}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Manual Post Mapping</h2>
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 40 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Select post plan
              <select
                style={inputStyle}
                value={selectedPlan}
                onChange={(event) => setSelectedPlan(event.target.value)}
              >
                <option value="">Select a plan...</option>
                {plans.length === 0 ? (
                  <option value="" disabled>No plans available</option>
                ) : (
                  plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.caption} ({plan.status})
                    </option>
                  ))
                )}
              </select>
            </label>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TikTok video id (optional)
              <input
                style={inputStyle}
                value={videoId}
                onChange={(event) => setVideoId(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
          <div style={{ marginTop: 32 }}>
            <ActionButton 
              label="Mark as posted" 
              onClick={markPosted}
              disabled={!selectedPlan}
            />
          </div>
        </section>
      )}

      
    </div>
  );
}
