"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import PageHeader from "../../components/PageHeader";

type PlanPreview = {
  id: string;
  onscreenText: string;
  caption: string;
  status: string;
  scheduledFor?: string;
  recipeName?: string | null;
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

export default function PlanPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanPreview[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadPlans = async () => {
    const response = await fetch("/api/queue");
    const data = (await response.json()) as { plans: PlanPreview[] };
    setPlans((data.plans ?? []).slice(0, 6));
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  const handleTopUp = async () => {
    setMessage(null);
    setLoading(true);
    const response = await fetch("/api/queue/topup", { method: "POST" });
    const rawText = await response.text();
    const data = (rawText ? JSON.parse(rawText) : {}) as { warnings?: string[]; warning?: string };
    if (!response.ok) {
      setMessage(data.warning ?? "Draft generation failed.");
    } else if (data.warning) {
      setMessage(data.warning);
    } else if (data.warnings?.length) {
      setMessage(`Drafts created with ${data.warnings.length} warnings. Check the queue for details.`);
    } else {
      setMessage("Drafts created.");
    }
    setLoading(false);
    await loadPlans();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <PageHeader
        title="Plan"
        description="Generate your next drafts and review the copy before it hits the queue."
        actions={
          <>
            <ActionButton label={loading ? "Planning..." : "Generate drafts"} onClick={handleTopUp} />
            <ActionButton label="View queue" variant="secondary" onClick={() => router.push("/queue")} />
          </>
        }
      />

      {message ? (
        <div style={{ padding: 16, borderRadius: 12, backgroundColor: "#f8fafc", color: "#0f172a" }}>
          {message}
        </div>
      ) : null}

      {plans.length === 0 ? (
        <div style={{ ...cardStyle, alignItems: "center", textAlign: "center", color: "#64748b" }}>
          No drafts yet. Generate drafts to preview them here.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
          {plans.map((plan) => (
            <div key={plan.id} style={cardStyle}>
              <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
                PLAN #{plan.id.slice(0, 6)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", whiteSpace: "pre-line" }}>
                {plan.onscreenText}
              </div>
              <div style={{ color: "#475569" }}>{plan.caption}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {plan.recipeName ? `Hook: ${plan.recipeName}` : "Hook pending"} · {plan.status}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/queue" style={{ color: "#0f172a", fontWeight: 600 }}>
        Review full queue →
      </Link>
    </div>
  );
}
