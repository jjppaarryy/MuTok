 "use client";

import Link from "next/link";
import PageHeader from "../../components/PageHeader";

const cardStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 20,
  border: "1px solid #e2e8f0",
  backgroundColor: "white",
  display: "flex",
  flexDirection: "column",
  gap: 12
};

const steps = [
  {
    title: "Connect TikTok",
    description: "Connect your TikTok account so we can upload drafts.",
    href: "/connect",
    action: "Connect account"
  },
  {
    title: "Upload clips & tracks",
    description: "Add the video clips and music you want to post.",
    href: "/assets",
    action: "Open library"
  },
  {
    title: "Approve snippets",
    description: "Pick the best moments from your track list.",
    href: "/assets",
    action: "Review snippets"
  },
  {
    title: "Create hooks",
    description: "Add or refine your hook library before planning.",
    href: "/recipes",
    action: "Edit hooks"
  },
  {
    title: "Set safety rules",
    description: "Confirm schedule windows and safety caps.",
    href: "/rules",
    action: "Review rules"
  }
];

export default function SetupPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <PageHeader
        title="Setup"
        description="Complete these steps once, then the system can plan drafts for you."
        tip="Start here if you're new."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
        {steps.map((step) => (
          <div key={step.title} style={cardStyle}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{step.title}</div>
            <div style={{ color: "#475569" }}>{step.description}</div>
            <Link href={step.href} style={{ color: "#0f172a", fontWeight: 600 }}>
              {step.action} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
