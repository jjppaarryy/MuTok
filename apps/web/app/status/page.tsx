"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import PageHeader from "../../components/PageHeader";

type EnvStatus = {
  key: string;
  present: boolean;
};

type StatusResponse = {
  envStatus: EnvStatus[];
  ffmpegOk: boolean;
  dbOk: boolean;
  assets: {
    clipCount: number;
    trackCount: number;
    approvedSnippets: number;
  };
  scheduler: {
    running: boolean;
  };
  authConnected: boolean;
  authExpiresAt?: string | null;
  uploadCooldownUntil?: string | null;
  dirChecks: { dir: string; ok: boolean }[];
};

type PipelineSummary = {
  planned: number;
  rendered: number;
  uploaded: number;
  skippedUploadReason?: string;
  warnings?: string[];
};

const cardStyle: React.CSSProperties = {
  padding: 48,
  borderRadius: 24,
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  gap: 24
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: 16,
  borderBottom: '1px solid #f1f5f9'
};

const valueStyle = (ok: boolean): React.CSSProperties => ({
  fontWeight: 800,
  fontSize: 15,
  color: ok ? '#059669' : '#e11d48',
  backgroundColor: ok ? '#ecfdf5' : '#fff1f2',
  padding: '6px 16px',
  borderRadius: 20,
  textTransform: 'uppercase'
});

export default function StatusPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [schedulerMessage, setSchedulerMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    const response = await fetch("/api/system/check");
    const data = (await response.json()) as StatusResponse;
    setStatus(data);
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const runPipeline = async () => {
    setMessage(null);
    const response = await fetch("/api/render/pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 1, dryRun: true })
    });
    if (response.ok) {
      setMessage("Pipeline test initiated.");
    } else {
      setMessage("Pipeline test failed.");
    }
  };

  const runFullPipeline = async () => {
    setMessage(null);
    const response = await fetch("/api/system/run-now", { method: "POST" });
    const data = (await response.json()) as { ok?: boolean; error?: string; summary?: PipelineSummary };
    if (!response.ok || !data.ok) {
      setMessage(data.error ?? "Pipeline run failed.");
      return;
    }
    const summary = data.summary;
    if (!summary) {
      setMessage("Pipeline run completed.");
      return;
    }
    const lines = [
      `Pipeline run completed: planned ${summary.planned}, rendered ${summary.rendered}, uploaded ${summary.uploaded}.`
    ];
    if (summary.skippedUploadReason) {
      lines.push(`Upload skipped: ${summary.skippedUploadReason}`);
    }
    if (summary.warnings && summary.warnings.length > 0) {
      lines.push(`Planner warnings: ${summary.warnings.join(" • ")}`);
    }
    setMessage(lines.join(" "));
    await loadStatus();
  };

  const startScheduler = async () => {
    setSchedulerMessage(null);
    const response = await fetch("/api/scheduler/start", { method: "POST" });
    if (response.ok) {
      setSchedulerMessage("Scheduler started.");
      await loadStatus();
    } else {
      const data = (await response.json()) as { error?: string };
      setSchedulerMessage(data.error ?? "Scheduler start failed.");
    }
  };

  const stopScheduler = async () => {
    setSchedulerMessage(null);
    const response = await fetch("/api/scheduler/stop", { method: "POST" });
    if (response.ok) {
      setSchedulerMessage("Scheduler stopped.");
      await loadStatus();
    } else {
      const data = (await response.json()) as { error?: string };
      setSchedulerMessage(data.error ?? "Scheduler stop failed.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <PageHeader
        title="System Health"
        description="Quick checks for setup, rendering, and TikTok connection."
        actions={
          <div className="wrap-actions">
            <ActionButton label="Run system checks" onClick={loadStatus} title="Re-run environment checks." />
            <ActionButton
              label="Test render pipeline"
              variant="secondary"
              onClick={runPipeline}
              title="Run a quick render test."
            />
            <ActionButton
              label="Run full pipeline"
              variant="outline"
              onClick={runFullPipeline}
              title="Plan, render, and upload a draft now."
            />
          </div>
        }
      />

      <div style={{ padding: 16, borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569" }}>
        Run checks anytime you change setup. Test render checks output without uploading. Run full pipeline plans, renders, and uploads a draft (respects caps).
      </div>

      {message ? (
        <div style={{ padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', backgroundColor: '#f0fdf4', fontSize: 16, color: '#059669', fontWeight: 600 }}>
          {message}
        </div>
      ) : null}
      {schedulerMessage ? (
        <div style={{ padding: 16, borderRadius: 16, border: '1px solid #e2e8f0', backgroundColor: '#eef2ff', fontSize: 14, color: '#4338ca', fontWeight: 600 }}>
          {schedulerMessage}
        </div>
      ) : null}

      {status ? (
        <div className="grid-2" style={{ gap: 32 }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Keys & Tools</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {status.envStatus.map((env) => (
                <div key={env.key} style={rowStyle}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>{env.key}</span>
                  <span style={valueStyle(env.present)}>{env.present ? "OK" : "Missing"}</span>
                </div>
              ))}
              <div style={rowStyle}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>FFmpeg</span>
                <span style={valueStyle(status.ffmpegOk)}>{status.ffmpegOk ? "OK" : "Missing"}</span>
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Database</span>
                <span style={valueStyle(status.dbOk)}>{status.dbOk ? "OK" : "Error"}</span>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Library & Queue</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={rowStyle}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Clips</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{status.assets.clipCount}</span>
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Tracks</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{status.assets.trackCount}</span>
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Approved snippets</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{status.assets.approvedSnippets}</span>
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Scheduler</span>
                <span style={valueStyle(status.scheduler.running)}>{status.scheduler.running ? "Running" : "Stopped"}</span>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <ActionButton label="Start auto-run" onClick={startScheduler} />
                <ActionButton label="Stop auto-run" variant="outline" onClick={stopScheduler} />
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>TikTok Connection</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={rowStyle}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>OAuth</span>
                <span style={valueStyle(status.authConnected)}>{status.authConnected ? "Connected" : "Disconnected"}</span>
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Token expiry</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  {status.authExpiresAt
                    ? new Date(status.authExpiresAt).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>Upload cooldown</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  {status.uploadCooldownUntil
                    ? new Date(status.uploadCooldownUntil).toLocaleString()
                    : "None"}
                </span>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Storage</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {status.dirChecks.map((dir) => (
                <div key={dir.dir} style={rowStyle}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>{dir.dir.split("/").slice(-2).join("/")}</span>
                  <span style={valueStyle(dir.ok)}>{dir.ok ? "OK" : "Missing"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...cardStyle, fontSize: 16, color: '#64748b', textAlign: 'center' }}>
          Run checks to see system status.
        </div>
      )}
    </div>
  );
}
