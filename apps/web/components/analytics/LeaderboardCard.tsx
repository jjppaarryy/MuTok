type LeaderboardRow = { label: string; score: number; count: number };

type LeaderboardCardProps = {
  title: string;
  rows: LeaderboardRow[];
  emptyText?: string;
};

const cardStyle: React.CSSProperties = {
  padding: 48,
  borderRadius: 24,
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  display: "flex",
  flexDirection: "column",
  gap: 24
};

export default function LeaderboardCard({ title, rows, emptyText }: LeaderboardCardProps) {
  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{title}</h2>
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20, fontSize: 16, color: "#475569" }}>
        {rows.length ? (
          rows.slice(0, 5).map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontWeight: 800, color: "#0f172a", backgroundColor: "#f1f5f9", padding: "4px 12px", borderRadius: 20, fontSize: 14 }}>
                {row.score.toFixed(2)} ({row.count})
              </span>
            </div>
          ))
        ) : (
          <div style={{ color: "#94a3b8" }}>{emptyText ?? "No data yet."}</div>
        )}
      </div>
    </div>
  );
}
