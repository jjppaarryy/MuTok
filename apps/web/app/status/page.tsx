"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InlineTip from "../../components/InlineTip";

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
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
        <div>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, marginBottom: 12, color: '#0f172a' }}>
            System Status
          </h1>
          <p style={{ fontSize: 17, maxWidth: 600, color: '#64748b' }}>
            Quick diagnostics for environment, pipeline, and TikTok auth.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, fontSize: 14, color: "#64748b" }}>
            Fix anything that shows “Missing” before you run the queue.
            <InlineTip text="This is the fastest place to debug setup issues." />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <ActionButton label="Run checks" onClick={loadStatus} title="Re-run environment checks." />
          <ActionButton
            label="Test pipeline"
            variant="secondary"
            onClick={runPipeline}
            title="Run a quick render test."
          />
        </div>
      </header>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Environment</h2>
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
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Assets & Queue</h2>
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
                <ActionButton label="Start scheduler" onClick={startScheduler} />
                <ActionButton label="Stop scheduler" variant="outline" onClick={stopScheduler} />
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>TikTok</h2>
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
