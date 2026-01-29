"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InlineTip from "../../components/InlineTip";
import PageHeader from "../../components/PageHeader";

const schemaPreview = `{
  "run_id": "string",
  "posts": [
    {
      "scheduled_for": "ISO date",
      "container": "static_daw | montage",
      "clip_ids": ["string"],
      "track_id": "string",
      "snippet_id": "string",
      "onscreen_text": "string",
      "caption": "string",
      "hook_family": "string",
      "confidence": 0.0,
      "reasons": ["string"]
    }
  ]
}`;

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

const textareaStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  padding: '24px',
  fontSize: 16,
  fontWeight: 500,
  color: '#0f172a',
  outline: 'none',
  lineHeight: 1.6,
  fontFamily: 'ui-monospace, monospace'
};

const preStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  padding: '24px',
  fontSize: 14,
  fontWeight: 500,
  color: '#475569',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  fontFamily: 'ui-monospace, monospace'
};

export default function BrainPage() {
  const [lastPrompt, setLastPrompt] = useState<string>("");
  const [lastResponse, setLastResponse] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>("");

  const loadLast = async () => {
    const response = await fetch("/api/brain/last");
    const data = (await response.json()) as {
      lastPrompt?: string;
      lastResponse?: string;
    };
    setLastPrompt(data.lastPrompt ?? "");
    setLastResponse(data.lastResponse ?? "");
  };

  const loadSystemPrompt = async () => {
    const response = await fetch("/api/brain/settings");
    const data = (await response.json()) as { brain?: { system_prompt?: string } };
    setSystemPrompt(
      data.brain?.system_prompt ??
        "You are MuTok, a TikTok hook-testing agent focused on music-first clips."
    );
  };

  useEffect(() => {
    void loadLast();
    void loadSystemPrompt();
  }, []);

  const runNow = () => {
    setMessage("Brain runs are disabled. Recipes are fixed and deterministic.");
  };

  const savePrompt = async () => {
    await fetch("/api/brain/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_prompt: systemPrompt })
    });
    setMessage("System prompt saved.");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <PageHeader
        title="MuTok Brain"
        description="Brain runs are disabled. Recipes are fixed and deterministic."
        tip="Use analysis tools to review winners and propose new recipes."
        actions={
          <div style={{ display: 'flex', gap: 16 }}>
            <ActionButton
              label="Brain disabled"
              onClick={runNow}
              title="Brain runs are disabled."
            />
            <ActionButton
              label="Save system prompt"
              variant="secondary"
              onClick={savePrompt}
              title="Save your prompt changes."
            />
          </div>
        }
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748b" }}>
        Edit the prompt, then run the brain when you want new ideas.
        <InlineTip text="If you don’t want AI plans, you can skip this page." />
      </div>

      {message ? (
        <div style={{ padding: '20px 32px', borderRadius: 16, backgroundColor: '#ecfdf5', color: '#065f46', fontSize: 16, fontWeight: 600, border: '1px solid #a7f3d0' }}>
          {message}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>System Prompt</h2>
          <textarea
            style={{ ...textareaStyle, minHeight: 400 }}
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
          />
        </div>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>JSON Schema</h2>
          <pre style={preStyle}>
            {schemaPreview}
          </pre>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Debug Payloads</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Last Prompt</div>
            <div style={{ padding: 24, borderRadius: 16, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 14, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {lastPrompt || "No prompt data available yet."}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Last Response</div>
            <div style={{ padding: 24, borderRadius: 16, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 14, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {lastResponse || "No response data available yet."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
