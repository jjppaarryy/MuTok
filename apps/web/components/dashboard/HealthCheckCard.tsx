type HealthCheckCardProps = {
  authConnected?: boolean;
  authExpiresAt?: string | null;
  recoveryActive?: boolean;
  spamErrors?: number;
  retireCount: number;
};

const cardStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 20,
  border: "1px solid #e2e8f0",
  backgroundColor: "white",
  display: "flex",
  flexDirection: "column",
  gap: 16
};

export default function HealthCheckCard({
  authConnected,
  authExpiresAt,
  recoveryActive,
  spamErrors,
  retireCount
}: HealthCheckCardProps) {
  return (
    <section style={cardStyle}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>System status</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>TikTok</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
            {authConnected ? "Connected" : "Not connected"}
          </div>
          <div style={{ color: "#64748b" }}>Expires {authExpiresAt ?? "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>Safety</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
            {recoveryActive ? "Recovery mode" : "Normal mode"}
          </div>
          <div style={{ color: "#64748b" }}>Spam warnings: {spamErrors ?? 0}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>Learnings</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
            {retireCount} hooks to review
          </div>
          <div style={{ color: "#64748b" }}>Check low performers</div>
        </div>
      </div>
    </section>
  );
}
