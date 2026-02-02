import Link from "next/link";

type StudioStatsGridProps = {
  draftCount: number;
  nextRun: string;
  activeHooks: number;
  hooksShortfall: number;
  approvedSnippets: number;
  clipCount: number;
  trackCount: number;
};

const cardStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 20,
  border: "1px solid #e2e8f0",
  backgroundColor: "white",
  display: "flex",
  flexDirection: "column",
  gap: 12
};

export default function StudioStatsGrid({
  draftCount,
  nextRun,
  activeHooks,
  hooksShortfall,
  approvedSnippets,
  clipCount,
  trackCount
}: StudioStatsGridProps) {
  return (
    <section className="grid-3">
      <div style={cardStyle}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>QUEUE</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>{draftCount} drafts ready</div>
        <div style={{ color: "#64748b" }}>Next window: {nextRun}</div>
        <Link href="/queue" style={{ color: "#0f172a", fontWeight: 600 }}>
          Open queue →
        </Link>
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>HOOKS</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>{activeHooks} active</div>
        <div style={{ color: "#64748b" }}>{hooksShortfall} more needed for full week</div>
        <Link href="/recipes" style={{ color: "#0f172a", fontWeight: 600 }}>
          Manage hooks →
        </Link>
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>LIBRARY</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>
          {approvedSnippets} snippets ready
        </div>
        <div style={{ color: "#64748b" }}>
          {clipCount} clips · {trackCount} tracks
        </div>
        <Link href="/assets" style={{ color: "#0f172a", fontWeight: 600 }}>
          Open library →
        </Link>
      </div>
    </section>
  );
}
