import ActionButton from "../ActionButton";

type Clip = {
  id: string;
  filePath: string;
  category: string;
};

export type QueuePlan = {
  id: string;
  container: string;
  onscreenText: string;
  caption: string;
  status: string;
  compatibilityScore: number;
  scheduledFor?: string;
  renderPath?: string | null;
  renderHash?: string | null;
  tiktokPublishId?: string | null;
  clips: Clip[];
  recipeName?: string | null;
};

type QueuePlanCardProps = {
  plan: QueuePlan;
  loadingId: string | null;
  batchLoading: boolean;
  preflight?: { score: number; recommendation: string };
  tiktokStatus?: string;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
  onRender: (id: string) => void;
  onUpload: (id: string) => void;
  onCheckStatus: (id: string) => void;
};

const cardStyle: React.CSSProperties = {
  padding: 40,
  borderRadius: 24,
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  display: "flex",
  flexDirection: "column",
  gap: 24
};

const badgeStyle = (status: string): React.CSSProperties => ({
  padding: "8px 16px",
  borderRadius: 50,
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  backgroundColor: status === "RENDERED" ? "#ecfdf5" : "#f1f5f9",
  color: status === "RENDERED" ? "#065f46" : "#475569",
  border: status === "RENDERED" ? "1px solid #a7f3d0" : "1px solid #e2e8f0"
});

export default function QueuePlanCard({
  plan,
  loadingId,
  batchLoading,
  preflight,
  tiktokStatus,
  onRegenerate,
  onDelete,
  onRender,
  onUpload,
  onCheckStatus
}: QueuePlanCardProps) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>
            POST #{plan.id.slice(0, 8)}
          </div>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", whiteSpace: "pre-line" }}>
            {plan.onscreenText}
          </h3>
          <p style={{ fontSize: 16, color: "#475569", marginTop: 8 }}>{plan.caption}</p>
        </div>
        <div style={badgeStyle(plan.status)}>{plan.status}</div>
      </div>

      {plan.renderPath ? (
        <video
          src={`/api/render/${plan.id}/file?v=${plan.renderHash ?? plan.id}`}
          controls
          playsInline
          preload="auto"
          style={{
            width: "100%",
            maxWidth: 240,
            aspectRatio: "9 / 16",
            height: "auto",
            borderRadius: 16,
            backgroundColor: "#0f172a",
            objectFit: "cover"
          }}
        />
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 24, padding: "24px 0", borderTop: "1px solid #f1f5f9" }}>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>RECIPE</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>
            {plan.recipeName ?? "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>CONTAINER</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>{plan.container}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>COMPATIBILITY</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>{(plan.compatibilityScore * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>CLIPS</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>{plan.clips.length} items</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>PREFLIGHT</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginTop: 4,
              color: preflight
                ? preflight.recommendation === "upload"
                  ? "#065f46"
                  : preflight.recommendation === "review"
                  ? "#b45309"
                  : "#991b1b"
                : "#94a3b8"
            }}
          >
            {preflight ? `${preflight.score}/100` : plan.renderPath ? "Loading..." : "-"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>SCHEDULED</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", marginTop: 4 }}>
            {plan.scheduledFor ? new Date(plan.scheduledFor).toLocaleTimeString() : "Manual"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <ActionButton
          label={loadingId === plan.id ? "Regenerating..." : "Regenerate"}
          variant="ghost"
          title="Delete and create a new version of this plan."
          onClick={() => onRegenerate(plan.id)}
          disabled={loadingId === plan.id || batchLoading}
        />
        <ActionButton
          label={loadingId === plan.id ? "Deleting..." : "Delete"}
          variant="ghost"
          title="Delete this plan."
          onClick={() => onDelete(plan.id)}
          disabled={loadingId === plan.id || batchLoading}
        />
        <ActionButton
          label={loadingId === plan.id ? "Rendering..." : "Render"}
          variant="secondary"
          title="Render this plan into a video."
          onClick={() => onRender(plan.id)}
          disabled={loadingId === plan.id || batchLoading}
        />
        <ActionButton
          label={loadingId === plan.id ? "Uploading..." : "Upload Now"}
          title="Upload this as a TikTok draft."
          onClick={() => onUpload(plan.id)}
          disabled={loadingId === plan.id || batchLoading}
        />
        {plan.tiktokPublishId && (
          <ActionButton
            label={loadingId === plan.id ? "Checking..." : "Check Status"}
            variant="ghost"
            title="Check TikTok processing status."
            onClick={() => onCheckStatus(plan.id)}
            disabled={loadingId === plan.id || batchLoading}
          />
        )}
      </div>
      {(plan.tiktokPublishId || tiktokStatus) && (
        <div
          style={{
            padding: "12px 20px",
            borderRadius: 12,
            backgroundColor:
              tiktokStatus === "READY"
                ? "#ecfdf5"
                : tiktokStatus === "FAILED"
                ? "#fef2f2"
                : "#f0f9ff",
            color:
              tiktokStatus === "READY"
                ? "#065f46"
                : tiktokStatus === "FAILED"
                ? "#991b1b"
                : "#0369a1",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}
        >
          <span>TikTok:</span>
          <span>{tiktokStatus || "UPLOADED"}</span>
          {plan.tiktokPublishId && (
            <span style={{ fontSize: 12, opacity: 0.7 }}>(ID: {plan.tiktokPublishId.slice(0, 12)}...)</span>
          )}
        </div>
      )}
    </div>
  );
}
