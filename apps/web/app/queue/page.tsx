"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InlineTip from "../../components/InlineTip";
import PageHeader from "../../components/PageHeader";

type Clip = {
  id: string;
  filePath: string;
  category: string;
};

type PostPlan = {
  id: string;
  container: string;
  onscreenText: string;
  caption: string;
  status: string;
  compatibilityScore: number;
  scheduledFor?: string;
  renderPath?: string | null;
  renderHash?: string | null;
  clips: Clip[];
};

const cardStyle: React.CSSProperties = {
  padding: 40,
  borderRadius: 24,
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  gap: 24
};

const badgeStyle = (status: string): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 50,
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  backgroundColor: status === 'RENDERED' ? '#ecfdf5' : '#f1f5f9',
  color: status === 'RENDERED' ? '#065f46' : '#475569',
  border: status === 'RENDERED' ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
});

export default function QueuePage() {
  const [plans, setPlans] = useState<PostPlan[]>([]);
  const [draftCount, setDraftCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);

  const refresh = async () => {
    const response = await fetch("/api/queue");
    const data = (await response.json()) as { plans: PostPlan[] };
    setPlans(data.plans ?? []);

    const statusResponse = await fetch("/api/queue/status");
    const status = (await statusResponse.json()) as { draftCount: number; pendingCount: number };
    setDraftCount(status.draftCount);
    setPendingCount(status.pendingCount);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleTopUp = async () => {
    setMessage(null);
    setBatchLoading(true);
    const response = await fetch("/api/queue/topup", { method: "POST" });
    const rawText = await response.text();
    const data = (rawText ? JSON.parse(rawText) : {}) as {
      warnings?: string[];
      created?: string[];
      warning?: string;
    };
    if (!response.ok) {
      setMessage(data.warning ?? "Top up failed.");
    } else if (data.warning) {
      setMessage(data.warning);
    } else if (data.warnings?.length) {
      setMessage(`Top up finished with ${data.warnings.length} warnings.`);
    } else {
      setMessage("Top up complete.");
    }
    setBatchLoading(false);
    await refresh();
  };

  const handleRenderPending = async () => {
    setMessage(null);
    setBatchLoading(true);
    const response = await fetch("/api/render/pending", { method: "POST" });
    const rawText = await response.text();
    const data = (rawText ? JSON.parse(rawText) : {}) as {
      warning?: string;
      results?: Array<{ status: string }>;
    };
    if (!response.ok) {
      setMessage(data.warning ?? "Render pending failed.");
    } else if (data.warning) {
      setMessage(data.warning);
    } else {
      const rendered =
        data.results?.filter((item) => item.status === "RENDERED").length ?? 0;
      setMessage(`Rendered ${rendered} plan${rendered === 1 ? "" : "s"}.`);
    }
    setBatchLoading(false);
    await refresh();
  };

  const handleRenderOne = async (postPlanId: string) => {
    setMessage(null);
    setLoadingId(postPlanId);
    const response = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postPlanId })
    });
    const rawText = await response.text();
    const data = (rawText ? JSON.parse(rawText) : {}) as {
      error?: string;
      status?: string;
    };
    if (!response.ok) {
      setMessage(data.error ?? "Render failed.");
    } else {
      setMessage(`Render ${data.status ?? "complete"}.`);
    }
    setLoadingId(null);
    await refresh();
  };

  const handleUploadOne = async (postPlanId: string) => {
    setMessage(null);
    setLoadingId(postPlanId);
    const response = await fetch("/api/tiktok/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postPlanId })
    });
    const rawText = await response.text();
    const data = (rawText ? JSON.parse(rawText) : {}) as {
      error?: string;
      status?: string;
    };
    if (!response.ok) {
      setMessage(data.error ?? "Upload failed.");
    } else {
      setMessage("Uploaded as draft.");
    }
    setLoadingId(null);
    await refresh();
  };

  const handleDeleteOne = async (postPlanId: string) => {
    setMessage(null);
    setLoadingId(postPlanId);
    try {
      const response = await fetch("/api/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postPlanId })
      });
      const rawText = await response.text();
      const data = (rawText ? JSON.parse(rawText) : {}) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? "Delete failed.");
      } else {
        setMessage("Post deleted.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setLoadingId(null);
      await refresh();
    }
  };

  const handleRegenerateOne = async (postPlanId: string) => {
    setMessage(null);
    setLoadingId(postPlanId);
    try {
      // First delete the current plan
      const deleteResponse = await fetch("/api/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postPlanId })
      });
      
      if (!deleteResponse.ok) {
        const data = await deleteResponse.json();
        throw new Error(data.error || "Failed to delete old plan");
      }

      // Then create a new plan to replace it
      const topupResponse = await fetch("/api/queue/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 1 })
      });
      
      const topupData = await topupResponse.json() as { created?: string[]; warning?: string };
      
      if (!topupResponse.ok) {
        setMessage(topupData.warning || "Failed to create replacement plan");
      } else if (topupData.created?.length) {
        setMessage("Plan regenerated successfully.");
      } else {
        setMessage("Old plan deleted but couldn't create replacement.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Regenerate failed.");
    } finally {
      setLoadingId(null);
      await refresh();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <PageHeader
        title="Queue"
        description="Plans, renders, and draft uploads live here."
        tip="Step 4: generate, render, then upload drafts."
        actions={
          <div style={{ display: 'flex', gap: 16 }}>
            <ActionButton
              label={batchLoading ? "Working..." : "Top up"}
              onClick={handleTopUp}
              disabled={batchLoading}
              title="Make new plans."
            />
            <ActionButton
              label={batchLoading ? "Working..." : "Render pending"}
              variant="secondary"
              onClick={handleRenderPending}
              disabled={batchLoading}
              title="Turn plans into videos."
            />
          </div>
        }
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748b" }}>
        Top up → Render → Upload drafts.
        <InlineTip text="Uploads pause if TikTok pending shares hit the 5-per-24h cap." />
      </div>

      {message ? (
        <div style={{ padding: '20px 32px', borderRadius: 16, backgroundColor: '#ecfdf5', color: '#065f46', fontSize: 16, fontWeight: 600, border: '1px solid #a7f3d0' }}>
          {message}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div style={{ padding: '16px 32px', borderRadius: 16, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Drafts queued</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{draftCount}</div>
        </div>
        <div style={{ padding: '16px 32px', borderRadius: 16, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Pending shares</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{pendingCount}</div>
        </div>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {plans.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', color: '#64748b' }}>No plans generated yet.</div>
        ) : (
          plans.map((post) => (
            <div key={post.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>POST #{post.id.slice(0, 8)}</div>
                  <h3 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', whiteSpace: "pre-line" }}>
                    {post.onscreenText}
                  </h3>
                  <p style={{ fontSize: 16, color: '#475569', marginTop: 8 }}>{post.caption}</p>
                </div>
                <div style={badgeStyle(post.status)}>{post.status}</div>
              </div>

              {post.renderPath ? (
                <video
                  src={`/api/render/${post.id}/file?v=${post.renderHash ?? post.id}`}
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, padding: '24px 0', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>CONTAINER</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginTop: 4 }}>{post.container}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>COMPATIBILITY</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginTop: 4 }}>{(post.compatibilityScore * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>CLIPS</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginTop: 4 }}>{post.clips.length} items</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>SCHEDULED</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginTop: 4 }}>{post.scheduledFor ? new Date(post.scheduledFor).toLocaleTimeString() : 'Manual'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <ActionButton
                  label={loadingId === post.id ? "Regenerating..." : "Regenerate"}
                  variant="ghost"
                  title="Delete and create a new version of this plan."
                  onClick={() => handleRegenerateOne(post.id)}
                  disabled={loadingId === post.id || batchLoading}
                />
                <ActionButton
                  label={loadingId === post.id ? "Deleting..." : "Delete"}
                  variant="ghost"
                  title="Delete this plan."
                  onClick={() => handleDeleteOne(post.id)}
                  disabled={loadingId === post.id || batchLoading}
                />
                <ActionButton
                  label={loadingId === post.id ? "Rendering..." : "Render"}
                  variant="secondary"
                  title="Render this plan into a video."
                  onClick={() => handleRenderOne(post.id)}
                  disabled={loadingId === post.id || batchLoading}
                />
                <ActionButton
                  label={loadingId === post.id ? "Uploading..." : "Upload Now"}
                  title="Upload this as a TikTok draft."
                  onClick={() => handleUploadOne(post.id)}
                  disabled={loadingId === post.id || batchLoading}
                />
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
