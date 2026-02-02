type VarietyRingProps = {
  label: string;
  value: number;
  target: number;
  hint?: string;
};

export default function VarietyRing({ label, value, target, hint }: VarietyRingProps) {
  const safeTarget = Math.max(1, target);
  const percent = Math.min(1, value / safeTarget);
  const color = percent >= 1 ? "#22c55e" : percent >= 0.6 ? "#f59e0b" : "#ef4444";
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dash = percent * circumference;
  return (
    <div style={{ padding: 16, borderRadius: 16, border: "1px solid #e2e8f0", background: "white", display: "grid", gap: 8 }}>
      <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg viewBox="0 0 100 100" width="90" height="90">
          <circle cx="50" cy="50" r={radius} stroke="#e2e8f0" strokeWidth="10" fill="transparent" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={circumference * 0.25}
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="54" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0f172a">
            {Math.round(percent * 100)}%
          </text>
        </svg>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            {value} / {target}
          </div>
          {hint ? <div style={{ fontSize: 12, color: "#64748b" }}>{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}
