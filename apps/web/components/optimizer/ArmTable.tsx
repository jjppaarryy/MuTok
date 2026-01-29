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

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse"
};

const headerStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "#64748b",
  paddingBottom: 12
};

const cellStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#0f172a",
  padding: "10px 0",
  borderTop: "1px solid #f1f5f9"
};

type ArmTableProps = {
  title: string;
  rows: ArmRow[];
};

export default function ArmTable({ title, rows }: ArmTableProps) {
  return (
    <section style={{ padding: 32, borderRadius: 24, border: "1px solid #e2e8f0", background: "white" }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 14, color: "#94a3b8" }}>No arms yet.</div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerStyle}>Name</th>
              <th style={headerStyle}>Status</th>
              <th style={headerStyle}>Pulls</th>
              <th style={headerStyle}>Views</th>
              <th style={headerStyle}>Mean reward</th>
              <th style={headerStyle}>Confidence</th>
              <th style={headerStyle}>Last used</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={cellStyle}>{row.name}</td>
                <td style={{ ...cellStyle, color: "#475569" }}>{row.status}</td>
                <td style={cellStyle}>{row.pulls}</td>
                <td style={cellStyle}>{row.impressions}</td>
                <td style={cellStyle}>{row.meanReward.toFixed(2)}</td>
                <td style={cellStyle}>{(row.confidence * 100).toFixed(0)}%</td>
                <td style={{ ...cellStyle, color: "#64748b" }}>
                  {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
