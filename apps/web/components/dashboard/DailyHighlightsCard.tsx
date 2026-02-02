type DailyHighlights = {
  winnerHook?: string | null;
  snippetTrend?: string | null;
};

type DailyHighlightsCardProps = {
  highlights: DailyHighlights | null;
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

export default function DailyHighlightsCard({ highlights }: DailyHighlightsCardProps) {
  const hasData = Boolean(highlights?.winnerHook || highlights?.snippetTrend);
  return (
    <section style={cardStyle}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Today’s highlights</div>
      {!hasData ? (
        <div style={{ color: "#94a3b8" }}>No performance data yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {highlights?.winnerHook ? (
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>Winner hook</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                {highlights.winnerHook}
              </div>
            </div>
          ) : null}
          {highlights?.snippetTrend ? (
            <div>
              <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>Trending snippet</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                {highlights.snippetTrend}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
