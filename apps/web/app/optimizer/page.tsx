"use client";

import { useEffect, useMemo, useState } from "react";
import ArmTable from "../../components/optimizer/ArmTable";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <header>
        <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, marginBottom: 10, color: "#0f172a" }}>
          Optimiser Leaderboard
        </h1>
        <p style={{ fontSize: 16, color: "#64748b" }}>
          See learning stability, confidence and which arms are actually winning.
        </p>
      </header>

      <section style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ padding: "16px 20px", borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
            Exploration rate (7d)
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{(summary.explorationRate * 100).toFixed(0)}%</div>
        </div>
        <div style={{ padding: "16px 20px", borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
            Guardrail excludes (7d)
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.guardrailsExcluded}</div>
        </div>
        <div style={{ padding: "16px 20px", borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
            Pending throttles (7d)
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.throttleHits}</div>
        </div>
        <div style={{ padding: "16px 20px", borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
            Viral confidence
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{Math.round(summary.viralConfidence * 100)}%</div>
        </div>
        <div style={{ padding: "16px 20px", borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
            Reward uplift (7d vs 30d)
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{(summary.uplift * 100).toFixed(1)}%</div>
        </div>
        <div style={{ padding: "16px 20px", borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
            CTA repairs (7d)
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.repairEvents}</div>
        </div>
      </section>

      <section style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>
          Filter
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            style={{ marginLeft: 12, padding: "8px 12px", borderRadius: 12, border: "1px solid #e2e8f0" }}
          >
            {["ALL", "RECIPE", "CTA", "VARIANT", "CONTAINER", "CLIP", "SNIPPET"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>
          Sort
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            style={{ marginLeft: 12, padding: "8px 12px", borderRadius: 12, border: "1px solid #e2e8f0" }}
          >
            <option value="confidence_adjusted">Confidence-adjusted</option>
            <option value="confidence">Confidence</option>
            <option value="reward">Mean reward</option>
            <option value="pulls">Pulls</option>
          </select>
        </label>
      </section>

      {(filter === "ALL"
        ? ["RECIPE", "CTA", "VARIANT", "CONTAINER", "CLIP", "SNIPPET"]
        : [filter]
      ).map((type) => (
        <ArmTable key={type} title={type} rows={byType(type)} />
      ))}
    </div>
  );
}
