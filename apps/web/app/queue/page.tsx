"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InlineTip from "../../components/InlineTip";
import PageHeader from "../../components/PageHeader";
import QueuePlanCard, { QueuePlan } from "../../components/queue/QueuePlanCard";

const emptyCardStyle: React.CSSProperties = { padding: 40, borderRadius: 24, backgroundColor: "white", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", gap: 24, textAlign: "center", color: "#64748b" };

export default function QueuePage() {
  const [plans, setPlans] = useState<QueuePlan[]>([]);
  const [draftCount, setDraftCount] = useState<number>(0); const [pendingCount, setPendingCount] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null); const [loadingId, setLoadingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<boolean>(false); const [tiktokStatus, setTiktokStatus] = useState<Record<string, string>>({});
  const [preflightScores, setPreflightScores] = useState<Record<string, { score: number; recommendation: string }>>({});

  const fetchPreflightScore = async (postId: string) => {
    try {
      const response = await fetch(`/api/queue/preflight?postPlanId=${postId}`);
      if (response.ok) {
        const data = (await response.json()) as { score: number; recommendation: string };
        setPreflightScores((prev) => ({ ...prev, [postId]: data }));
      }
    } catch {
      // Ignore errors for preflight scoring
    }
  };

  const refresh = async () => {
    const response = await fetch("/api/queue");
    const data = (await response.json()) as { plans: QueuePlan[] };
    setPlans(data.plans ?? []);
    for (const plan of data.plans ?? []) {
      if (plan.renderPath && !plan.tiktokPublishId) {
        void fetchPreflightScore(plan.id);
      }
    }

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

  const handleCheckStatus = async (postPlanId: string) => {
    setMessage(null);
    setLoadingId(postPlanId);
    try {
      const response = await fetch(`/api/tiktok/publish-status?postPlanId=${postPlanId}`);
      const data = (await response.json()) as {
        status?: string;
        failReason?: string;
        error?: string;
      };
      if (!response.ok) {
        setMessage(data.error ?? "Status check failed.");
      } else {
        setTiktokStatus((prev) => ({ ...prev, [postPlanId]: data.status ?? "UNKNOWN" }));
        if (data.status === "FAILED" && data.failReason) {
          setMessage(`TikTok: ${data.status} - ${data.failReason}`);
        } else {
          setMessage(`TikTok: ${data.status}`);
        }
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Status check failed.");
    } finally {
      setLoadingId(null);
    }
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
          <div style={emptyCardStyle}>No plans generated yet.</div>
        ) : (
          plans.map((post) => (
            <QueuePlanCard
              key={post.id}
              plan={post}
              loadingId={loadingId}
              batchLoading={batchLoading}
              preflight={preflightScores[post.id]}
              tiktokStatus={tiktokStatus[post.id]}
              onRegenerate={handleRegenerateOne}
              onDelete={handleDeleteOne}
              onRender={handleRenderOne}
              onUpload={handleUploadOne}
              onCheckStatus={handleCheckStatus}
            />
          ))
        )}
      </section>
    </div>
  );
}
