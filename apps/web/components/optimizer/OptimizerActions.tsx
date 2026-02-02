import Link from "next/link";

export default function OptimizerActions() {
  return (
    <div className="grid-2">
      <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>How to promote winners</div>
        <div style={{ fontSize: 14, color: "#475569" }}>
          Keep top hooks enabled in <Link href="/recipes" style={{ color: "#0f172a", fontWeight: 600 }}>Hooks</Link>, keep top CTAs active in <Link href="/viral" style={{ color: "#0f172a", fontWeight: 600 }}>Testing</Link>, and keep strong clips/snippets in <Link href="/assets" style={{ color: "#0f172a", fontWeight: 600 }}>Library</Link>.
        </div>
      </div>
      <div style={{ padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>How to retire or pause</div>
        <div style={{ fontSize: 14, color: "#475569" }}>
          Archive weak hooks in <Link href="/recipes" style={{ color: "#0f172a", fontWeight: 600 }}>Hooks</Link>, switch CTAs to “retired” in <Link href="/viral" style={{ color: "#0f172a", fontWeight: 600 }}>Testing</Link>, and remove weak clips/snippets from <Link href="/assets" style={{ color: "#0f172a", fontWeight: 600 }}>Library</Link>.
        </div>
      </div>
    </div>
  );
}
