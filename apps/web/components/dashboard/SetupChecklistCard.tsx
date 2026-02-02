import Link from "next/link";

type ChecklistItem = { label: string; href: string; done: boolean };

type SetupChecklistCardProps = {
  checklist: ChecklistItem[];
  collapsed: boolean;
  onToggle: () => void;
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

export default function SetupChecklistCard({
  checklist,
  collapsed,
  onToggle
}: SetupChecklistCardProps) {
  const completed = checklist.filter((item) => item.done).length;
  const total = checklist.length || 1;
  const progress = Math.round((completed / total) * 100);

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Setup checklist</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>{progress}% complete</div>
        </div>
        <button
          onClick={onToggle}
          style={{
            border: "1px solid #e2e8f0",
            background: "#fff",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            cursor: "pointer"
          }}
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>
      {!collapsed ? (
        <div className="grid-2">
          {checklist.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                color: "#0f172a",
                textDecoration: "none",
                backgroundColor: item.done ? "#f0fdf4" : "white"
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: item.done ? "#22c55e" : "#e2e8f0",
                  color: item.done ? "white" : "#475569",
                  fontSize: 14,
                  fontWeight: 700
                }}
              >
                {item.done ? "✓" : "•"}
              </span>
              <span style={{ fontWeight: 600 }}>{item.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
