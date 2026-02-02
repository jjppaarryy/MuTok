type ChartRow = {
  id: string;
  name: string;
  score: number;
};

type ScatterRow = {
  id: string;
  meanReward: number;
  confidence: number;
};

type TrendPoint = {
  label: string;
  value: number;
};

type MixSegment = {
  type: string;
  label: string;
  share: number;
};

type OptimizerChartsProps = {
  barLeaders: ChartRow[];
  barLaggers: ChartRow[];
  barMax: number;
  showTrend: boolean;
  trendPoints: TrendPoint[];
  trendMin: number;
  trendSpan: number;
  mixTotal: number;
  mixSegments: MixSegment[];
  rewardMin: number;
  rewardSpan: number;
  scatterRows: ScatterRow[];
};

export default function OptimizerCharts({
  barLeaders,
  barLaggers,
  barMax,
  showTrend,
  trendPoints,
  trendMin,
  trendSpan,
  mixTotal,
  mixSegments,
  rewardMin,
  rewardSpan,
  scatterRows
}: OptimizerChartsProps) {
  return (
    <>
      <section className="grid-2">
        <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Top vs low performers</div>
          {barLeaders.length === 0 ? (
            <div style={{ fontSize: 14, color: "#94a3b8" }}>Not enough data yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {barLeaders.map((row) => (
                <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#475569" }}>{row.name}</div>
                  <div style={{ height: 10, background: "#f1f5f9", borderRadius: 999 }}>
                    <div style={{ width: `${Math.max(4, (row.score / barMax) * 100)}%`, height: "100%", background: "#22c55e", borderRadius: 999 }} />
                  </div>
                </div>
              ))}
              {barLaggers.map((row) => (
                <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#475569" }}>{row.name}</div>
                  <div style={{ height: 10, background: "#f1f5f9", borderRadius: 999 }}>
                    <div style={{ width: `${Math.max(4, (row.score / barMax) * 100)}%`, height: "100%", background: "#ef4444", borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Performance trend</div>
          {showTrend ? (
            <svg viewBox="0 0 220 120" style={{ width: "100%", height: 120 }}>
              {trendPoints.map((point, index) => {
                const x = index === 0 ? 20 : 200;
                const y = 90 - ((point.value - trendMin) / trendSpan) * 70;
                return (
                  <g key={point.label}>
                    <circle cx={x} cy={y} r={4} fill="#0f172a" />
                    <text x={x} y={110} textAnchor="middle" fontSize="10" fill="#64748b">{point.label}</text>
                  </g>
                );
              })}
              <line
                x1={20}
                y1={90 - ((trendPoints[0].value - trendMin) / trendSpan) * 70}
                x2={200}
                y2={90 - ((trendPoints[1].value - trendMin) / trendSpan) * 70}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </svg>
          ) : (
            <div style={{ fontSize: 14, color: "#94a3b8" }}>No trend data yet.</div>
          )}
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Compares average performance from the last 30 days vs last 7 days.
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Mix by type</div>
          {mixTotal === 0 ? (
            <div style={{ fontSize: 14, color: "#94a3b8" }}>No data yet.</div>
          ) : (
            <div className="mix-grid">
              <svg viewBox="0 0 120 120" width="120" height="120">
                {(() => {
                  let offset = 0;
                  const colors = ["#0f172a", "#2563eb", "#22c55e", "#f97316", "#a855f7", "#ef4444", "#06b6d4"];
                  return mixSegments.map((segment, index) => {
                    const circumference = 2 * Math.PI * 44;
                    const dash = segment.share * circumference;
                    const circle = (
                      <circle
                        key={segment.type}
                        cx="60"
                        cy="60"
                        r="44"
                        fill="transparent"
                        stroke={colors[index % colors.length]}
                        strokeWidth="12"
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 60 60)"
                      />
                    );
                    offset += dash;
                    return circle;
                  });
                })()}
                <circle cx="60" cy="60" r="28" fill="white" />
              </svg>
              <div style={{ display: "grid", gap: 6 }}>
                {mixSegments.map((segment) => (
                  <div key={segment.type} style={{ fontSize: 12, color: "#475569", display: "flex", justifyContent: "space-between" }}>
                    <span>{segment.label}</span>
                    <span>{Math.round(segment.share * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Performance vs confidence</div>
          {scatterRows.length === 0 ? (
            <div style={{ fontSize: 14, color: "#94a3b8" }}>No data yet.</div>
          ) : (
            <svg viewBox="0 0 220 120" style={{ width: "100%", height: 120 }}>
              {scatterRows.map((row) => {
                const x = 20 + row.confidence * 180;
                const y = 100 - ((row.meanReward - rewardMin) / rewardSpan) * 80;
                return <circle key={row.id} cx={x} cy={y} r={2.5} fill="#0f172a" opacity={0.6} />;
              })}
              <text x="20" y="112" fontSize="10" fill="#94a3b8">Low confidence</text>
              <text x="140" y="112" fontSize="10" fill="#94a3b8">High confidence</text>
            </svg>
          )}
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Items in the top-right are strong and reliable.
          </div>
        </div>
      </section>
    </>
  );
}
