"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader";
import OptimizerActions from "../../components/optimizer/OptimizerActions";
import OptimizerCharts from "../../components/optimizer/OptimizerCharts";
import OptimizerInsights from "../../components/optimizer/OptimizerInsights";
import OptimizerLeaders from "../../components/optimizer/OptimizerLeaders";
import OptimizerStats from "../../components/optimizer/OptimizerStats";
import OptimizerTables from "../../components/optimizer/OptimizerTables";

type ArmRow = {
  id: string;
  armType: string;
  armId: string;
  name: string;
  status: string;
  pulls: number;
  impressions: number;
  meanReward: number;
  confidence: number;
  lastUsedAt: string | null;
};

type Summary = {
  explorationRate: number;
  guardrailsExcluded: number;
  throttleHits: number;
  recentMeanReward: number;
  priorMeanReward: number;
  uplift: number;
  viralConfidence: number;
  repairEvents: number;
};

export default function OptimizerPage() {
  const [rows, setRows] = useState<ArmRow[]>([]);
  const [summary, setSummary] = useState<Summary>({
    explorationRate: 0,
    guardrailsExcluded: 0,
    throttleHits: 0,
    recentMeanReward: 0,
    priorMeanReward: 0,
    uplift: 0,
    viralConfidence: 0,
    repairEvents: 0
  });
  const [filter, setFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("confidence_adjusted");
  const [showTables, setShowTables] = useState<boolean>(false);

  const load = async () => {
    const response = await fetch("/api/optimizer/arms");
    const data = (await response.json()) as { rows: ArmRow[]; summary: Summary };
    setRows(data.rows ?? []);
    setSummary(data.summary ?? summary);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const subset = filter === "ALL" ? rows : rows.filter((row) => row.armType === filter);
    const sorter = (a: ArmRow, b: ArmRow) => {
      if (sortBy === "reward") return b.meanReward - a.meanReward;
      if (sortBy === "pulls") return b.pulls - a.pulls;
      if (sortBy === "confidence") return b.confidence - a.confidence;
      return b.meanReward * b.confidence - a.meanReward * a.confidence;
    };
    return [...subset].sort(sorter);
  }, [rows, filter, sortBy]);

  const byType = (type: string) => filtered.filter((row) => row.armType === type);
  const typeLabel: Record<string, string> = {
    RECIPE: "Hooks",
    CTA: "CTAs",
    VARIANT: "Variants",
    CONTAINER: "Containers",
    CLIP: "Clips",
    SNIPPET: "Snippets"
  };
  const scored = useMemo(() => {
    return rows
      .map((row) => ({
        ...row,
        score: row.meanReward * row.confidence
      }))
      .sort((a, b) => b.score - a.score);
  }, [rows]);
  const topWinners = scored.slice(0, 3);
  const lowPerformers = [...scored].reverse().slice(0, 3);
  const typeCounts = useMemo(() => {
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.armType] = (acc[row.armType] ?? 0) + 1;
      return acc;
    }, {});
  }, [rows]);
  const mixTotal = Object.values(typeCounts).reduce((sum, value) => sum + value, 0);
  const mixSegments = Object.entries(typeCounts).map(([type, count]) => ({
    type,
    label: typeLabel[type] ?? type,
    count,
    share: mixTotal > 0 ? count / mixTotal : 0
  }));
  const barLeaders = scored.slice(0, 5);
  const barLaggers = [...scored].reverse().slice(0, 5);
  const barMax = Math.max(1, ...[...barLeaders, ...barLaggers].map((row) => row.score));
  const rewardMin = Math.min(0, ...rows.map((row) => row.meanReward));
  const rewardMax = Math.max(1, ...rows.map((row) => row.meanReward));
  const rewardSpan = Math.max(1, rewardMax - rewardMin);
  const showTrend = summary.priorMeanReward !== 0 || summary.recentMeanReward !== 0;
  const trendPoints = [
    { label: "Last 30d", value: summary.priorMeanReward },
    { label: "Last 7d", value: summary.recentMeanReward }
  ];
  const trendMin = Math.min(...trendPoints.map((point) => point.value));
  const trendMax = Math.max(...trendPoints.map((point) => point.value));
  const trendSpan = Math.max(0.0001, trendMax - trendMin);
  const stats = [
    {
      label: "Exploration (7d)",
      value: `${(summary.explorationRate * 100).toFixed(0)}%`,
      help: "Share of picks that were experimental."
    },
    {
      label: "Skipped by rules (7d)",
      value: `${summary.guardrailsExcluded}`,
      help: "Items blocked by safety rules/cooldowns."
    },
    {
      label: "Throttle hits (7d)",
      value: `${summary.throttleHits}`,
      help: "Times posting was slowed for safety."
    },
    {
      label: "Viral confidence",
      value: `${Math.round(summary.viralConfidence * 100)}%`,
      help: "Confidence in current winners."
    },
    {
      label: "Reward uplift",
      value: `${(summary.uplift * 100).toFixed(1)}%`,
      help: "Recent performance vs longer-term baseline."
    },
    {
      label: "CTA repairs (7d)",
      value: `${summary.repairEvents}`,
      help: "CTA auto-adjustments to meet rules."
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <PageHeader
        title="Performance Overview"
        description="See what’s winning so you can promote the best performers."
        tip="Charts first, tables available if you want details."
      />

      <OptimizerInsights />
      <OptimizerStats stats={stats} />
      <OptimizerCharts
        barLeaders={barLeaders}
        barLaggers={barLaggers}
        barMax={barMax}
        showTrend={showTrend}
        trendPoints={trendPoints}
        trendMin={trendMin}
        trendSpan={trendSpan}
        mixTotal={mixTotal}
        mixSegments={mixSegments}
        rewardMin={rewardMin}
        rewardSpan={rewardSpan}
        scatterRows={rows}
      />
      <OptimizerLeaders topWinners={topWinners} lowPerformers={lowPerformers} typeLabel={typeLabel} />
      <OptimizerActions />
      <OptimizerTables
        showTables={showTables}
        onToggle={() => setShowTables((prev) => !prev)}
        filter={filter}
        onFilterChange={setFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        typeLabel={typeLabel}
        types={filter === "ALL" ? ["RECIPE", "CTA", "VARIANT", "CONTAINER", "CLIP", "SNIPPET"] : [filter]}
        getRows={byType}
      />
    </div>
  );
}
