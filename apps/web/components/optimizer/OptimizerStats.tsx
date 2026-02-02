type StatItem = {
  label: string;
  value: string;
  help: string;
};

type OptimizerStatsProps = {
  stats: StatItem[];
};

export default function OptimizerStats({ stats }: OptimizerStatsProps) {
  return (
    <section className="grid-3">
      {stats.map((stat) => (
        <div key={stat.label} style={{ padding: "16px 20px", borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
            {stat.label}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{stat.value}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>{stat.help}</div>
        </div>
      ))}
    </section>
  );
}
