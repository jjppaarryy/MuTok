import Link from "next/link";
import ActionButton from "../ActionButton";

type NextAction = { label: string; href: string; reason: string };

type DailyStudioHeroProps = {
  readinessText: string;
  readinessTone: "ready" | "missing";
  nextRun: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  nextAction?: NextAction;
};

const cardStyle: React.CSSProperties = {
  padding: 28,
  borderRadius: 24,
  border: "1px solid #e2e8f0",
  backgroundColor: "white",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 20,
  alignItems: "center"
};

export default function DailyStudioHero({
  readinessText,
  readinessTone,
  nextRun,
  primaryActionLabel,
  onPrimaryAction,
  nextAction
}: DailyStudioHeroProps) {
  const readinessColor = readinessTone === "ready" ? "#065f46" : "#b45309";
  const readinessBg = readinessTone === "ready" ? "#ecfdf5" : "#fff7ed";
  return (
    <section style={cardStyle} className="grid-2">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
          Daily Studio
        </div>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            backgroundColor: readinessBg,
            color: readinessColor,
            fontSize: 15,
            fontWeight: 700
          }}
        >
          {readinessText}
        </div>
        <div style={{ fontSize: 13, color: "#64748b" }}>Next window: {nextRun}</div>
        <ActionButton label={primaryActionLabel} onClick={onPrimaryAction} />
      </div>
      <div
        style={{
          padding: 18,
          borderRadius: 18,
          border: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
          Next best action
        </div>
        {nextAction ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{nextAction.label}</div>
            <div style={{ color: "#64748b" }}>{nextAction.reason}</div>
            <Link href={nextAction.href} style={{ color: "#0f172a", fontWeight: 600 }}>
              Go now →
            </Link>
          </>
        ) : (
          <div style={{ color: "#64748b" }}>You’re all set for today.</div>
        )}
      </div>
    </section>
  );
}
