import ActionButton from "../ActionButton";

type PlanOption = {
  id: string;
  caption: string;
  status: string;
};

type ManualMappingCardProps = {
  plans: PlanOption[];
  selectedPlan: string;
  videoId: string;
  onSelectPlan: (value: string) => void;
  onVideoIdChange: (value: string) => void;
  onMark: () => void;
};

const cardStyle: React.CSSProperties = {
  padding: 32,
  borderRadius: 20,
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  display: "flex",
  flexDirection: "column",
  gap: 16
};

const inputStyle: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 500,
  color: "#0f172a",
  outline: "none"
};

export default function ManualMappingCard({
  plans,
  selectedPlan,
  videoId,
  onSelectPlan,
  onVideoIdChange,
  onMark
}: ManualMappingCardProps) {
  return (
    <section style={cardStyle}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Manual post mapping</div>
      <div style={{ fontSize: 14, color: "#64748b" }}>
        If TikTok metrics don’t match a plan, connect them here.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontWeight: 600, color: "#0f172a" }}>
          Post plan
          <select
            style={inputStyle}
            value={selectedPlan}
            onChange={(event) => onSelectPlan(event.target.value)}
          >
            <option value="">Select plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.caption.slice(0, 40)}... ({plan.status})
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontWeight: 600, color: "#0f172a" }}>
          TikTok video ID
          <input
            style={inputStyle}
            value={videoId}
            onChange={(event) => onVideoIdChange(event.target.value)}
            placeholder="e.g. 7301234567890"
          />
        </label>
      </div>
      <ActionButton label="Mark as posted" onClick={onMark} />
    </section>
  );
}
