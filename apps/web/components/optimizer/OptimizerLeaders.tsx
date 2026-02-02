type LeaderRow = {
  id: string;
  name: string;
  armType: string;
};

type OptimizerLeadersProps = {
  topWinners: LeaderRow[];
  lowPerformers: LeaderRow[];
  typeLabel: Record<string, string>;
};

export default function OptimizerLeaders({ topWinners, lowPerformers, typeLabel }: OptimizerLeadersProps) {
  return (
    <section className="grid-2">
      <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Top performers</div>
        {topWinners.length === 0 ? (
          <div style={{ fontSize: 14, color: "#94a3b8" }}>Not enough data yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {topWinners.map((row) => (
              <div key={row.id} style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>{row.name}</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                  {typeLabel[row.armType] ?? row.armType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Low performers</div>
        {lowPerformers.length === 0 ? (
          <div style={{ fontSize: 14, color: "#94a3b8" }}>Not enough data yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {lowPerformers.map((row) => (
              <div key={row.id} style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>{row.name}</span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                  {typeLabel[row.armType] ?? row.armType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
