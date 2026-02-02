export default function OptimizerInsights() {
  return (
    <div className="grid-2">
      <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>How to read this</div>
        <div style={{ fontSize: 14 }}>
          Each row is a tested item. Higher Performance + higher Confidence = better performer.
        </div>
      </div>
      <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>What to do next</div>
        <div style={{ fontSize: 14 }}>
          Promote the top items and retire or pause the lowest performers.
        </div>
      </div>
    </div>
  );
}
