type StatCardProps = {
  title: string;
  value: string;
  hint?: string;
};

export default function StatCard({ title, value, hint }: StatCardProps) {
  const styles = {
    card: { padding: 32, borderRadius: 20, position: "relative", overflow: "hidden" },
    accent: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      background: "linear-gradient(90deg, #fe2c55 0%, #25f4ee 50%, transparent 100%)"
    },
    title: { fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
    value: { fontSize: 40, fontWeight: 700, marginTop: 16, letterSpacing: -1 },
    hint: { fontSize: 14, marginTop: 12 }
  } as const;

  return (
    <div style={styles.card} className="card">
      <div style={styles.accent} />
      <div style={styles.title} className="stat-title text-slate-500">
        {title}
      </div>
      <div style={styles.value} className="stat-value text-slate-900">
        {value}
      </div>
      {hint ? (
        <div style={styles.hint} className="stat-hint text-slate-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
