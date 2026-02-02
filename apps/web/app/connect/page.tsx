"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InlineTip from "../../components/InlineTip";
import PageHeader from "../../components/PageHeader";

type Status = {
  connected: boolean;
  expiresAt?: string;
  isExpired?: boolean;
};

type EnvValue = {
  value: string;
  masked: boolean;
  hasValue: boolean;
};

type EnvValuesResponse = {
  TIKTOK_CLIENT_ID: EnvValue;
  TIKTOK_CLIENT_SECRET: EnvValue;
  TIKTOK_REDIRECT_URI: EnvValue;
  OPENAI_API_KEY: EnvValue;
};

type EnvInputs = {
  TIKTOK_CLIENT_ID: string;
  TIKTOK_CLIENT_SECRET: string;
  TIKTOK_REDIRECT_URI: string;
  OPENAI_API_KEY: string;
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

const inputStyle: React.CSSProperties = {
  marginTop: 12,
  width: '100%',
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  padding: '16px 20px',
  fontSize: 16,
  fontWeight: 500,
  color: '#0f172a',
  outline: 'none'
};

export default function ConnectPage() {
  const [status, setStatus] = useState<Status>({ connected: false });
  const [sandbox, setSandbox] = useState<boolean>(true);
  const [envValues, setEnvValues] = useState<EnvInputs>({
    TIKTOK_CLIENT_ID: "",
    TIKTOK_CLIENT_SECRET: "",
    TIKTOK_REDIRECT_URI: "",
    OPENAI_API_KEY: ""
  });
  const [envMeta, setEnvMeta] = useState<Record<string, { masked: boolean; hasValue: boolean }>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statusRes, envRes, settingsRes] = await Promise.all([
          fetch("/api/tiktok/status"),
          fetch("/api/settings/env"),
          fetch("/api/tiktok/settings")
        ]);
        
        if (statusRes.ok) {
          setStatus(await statusRes.json());
        }
        
        if (envRes.ok) {
          const data = await envRes.json() as { values: EnvValuesResponse };
          const inputs: EnvInputs = {
            TIKTOK_CLIENT_ID: data.values.TIKTOK_CLIENT_ID.value,
            TIKTOK_CLIENT_SECRET: data.values.TIKTOK_CLIENT_SECRET.value,
            TIKTOK_REDIRECT_URI: data.values.TIKTOK_REDIRECT_URI.value,
            OPENAI_API_KEY: data.values.OPENAI_API_KEY.value
          };
          setEnvValues(inputs);
          setEnvMeta({
            TIKTOK_CLIENT_ID: data.values.TIKTOK_CLIENT_ID,
            TIKTOK_CLIENT_SECRET: data.values.TIKTOK_CLIENT_SECRET,
            TIKTOK_REDIRECT_URI: data.values.TIKTOK_REDIRECT_URI,
            OPENAI_API_KEY: data.values.OPENAI_API_KEY
          });
        }

        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setSandbox(settings.sandbox ?? true);
        }
      } catch (err) {
        setError("Failed to load settings");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const errorParam = params.get("error");
    if (connected) {
      setMessage("TikTok connected successfully.");
    }
    if (errorParam) {
      setError(errorParam);
    }
  }, []);

  const updateEnv = (key: keyof EnvInputs, value: string) => {
    setEnvValues((prev) => ({ ...prev, [key]: value }));
  };

  const saveEnv = async () => {
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      // Only send values that have changed (not masked placeholders)
      const toSend: Partial<EnvInputs> = {};
      for (const key of Object.keys(envValues) as (keyof EnvInputs)[]) {
        const value = envValues[key];
        const meta = envMeta[key];
        // Only send if not a masked value or if user modified it
        if (!meta?.masked || !value.startsWith("****")) {
          toSend[key] = value;
        }
      }
      
      const res = await fetch("/api/settings/env", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSend)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }
      
      setMessage("Saved. You can connect your account now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const connectAccount = async () => {
    setMessage(null);
    setError(null);
    
    // Check if required fields have values (checking meta for masked fields)
    const requiredKeys: (keyof EnvInputs)[] = ["TIKTOK_CLIENT_ID", "TIKTOK_CLIENT_SECRET", "TIKTOK_REDIRECT_URI", "OPENAI_API_KEY"];
    const missing = requiredKeys.filter(key => {
      const meta = envMeta[key];
      const value = envValues[key];
      return !meta?.hasValue && !value;
    });
    
    if (missing.length > 0) {
      setError("Please fill in all API keys before connecting.");
      return;
    }
    setConnecting(true);
    try {
      const response = await fetch("/api/tiktok/connect");
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Missing TikTok setup.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start TikTok connect.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectAccount = async () => {
    setMessage(null);
    setError(null);
    setDisconnecting(true);
    try {
      const res = await fetch("/api/tiktok/disconnect", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Disconnect failed");
      }
      setStatus({ connected: false });
      setMessage("Successfully disconnected from TikTok.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed.");
    } finally {
      setDisconnecting(false);
    }
  };

  const toggleSandbox = async () => {
    const newSandbox = !sandbox;
    setSandbox(newSandbox);
    try {
      await fetch("/api/tiktok/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandbox: newSandbox })
      });
    } catch (err) {
      setSandbox(!newSandbox); // Revert on error
      setError("Failed to update sandbox mode");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ fontSize: 18, color: '#64748b' }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <PageHeader
        title="Connect TikTok"
        description="Link your TikTok account so drafts can be uploaded."
        tip="Step 1: add your API keys, then connect TikTok."
        actions={
          <div style={{ display: 'flex', gap: 16 }}>
            <ActionButton
              label={connecting ? "Connecting..." : "Connect Account"}
              onClick={connectAccount}
              title="Connect your TikTok account."
              disabled={connecting || disconnecting}
            />
            {status.connected && (
              <ActionButton
                label={disconnecting ? "Disconnecting..." : "Disconnect"}
                variant="ghost"
                onClick={disconnectAccount}
                title="Remove your saved TikTok connection."
                disabled={disconnecting || connecting}
              />
            )}
          </div>
        }
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748b" }}>
        Fill in the fields below, save, then connect your TikTok.
        <InlineTip text="You only need to do this once unless you change apps." />
      </div>

      {(message || error) ? (
        <div
          style={{
            padding: "16px 24px",
            borderRadius: 16,
            backgroundColor: error ? "#fff1f2" : "#ecfdf5",
            color: error ? "#be123c" : "#065f46",
            fontSize: 15,
            fontWeight: 600,
            border: `1px solid ${error ? "#fecdd3" : "#a7f3d0"}`
          }}
        >
          {error ?? message}
        </div>
      ) : null}

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>API Keys</h2>
            <p style={{ fontSize: 15, color: "#64748b", marginTop: 6 }}>
              Add your TikTok app keys and OpenAI key here.
            </p>
          </div>
          <ActionButton
            label={saving ? "Saving..." : "Save keys"}
            onClick={saveEnv}
            disabled={saving}
            title="Save these keys to your local app."
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          <label style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
            TikTok Client ID
            <input
              style={inputStyle}
              value={envValues.TIKTOK_CLIENT_ID}
              onChange={(event) => updateEnv("TIKTOK_CLIENT_ID", event.target.value)}
              placeholder="Paste Client ID"
            />
          </label>
          <label style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
            TikTok Client Secret
            <input
              style={inputStyle}
              value={envValues.TIKTOK_CLIENT_SECRET}
              onChange={(event) => updateEnv("TIKTOK_CLIENT_SECRET", event.target.value)}
              placeholder="Paste Client Secret"
            />
          </label>
          <label style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
            TikTok Redirect URL
            <input
              style={inputStyle}
              value={envValues.TIKTOK_REDIRECT_URI}
              onChange={(event) => updateEnv("TIKTOK_REDIRECT_URI", event.target.value)}
              placeholder="https://your-app/callback"
            />
          </label>
          <label style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
            OpenAI API Key
            <input
              style={inputStyle}
              value={envValues.OPENAI_API_KEY}
              onChange={(event) => updateEnv("OPENAI_API_KEY", event.target.value)}
              placeholder="Paste OpenAI key"
            />
          </label>
        </div>

        <div style={{ marginTop: 12, fontSize: 13, color: "#94a3b8" }}>
          Your keys are saved locally on this computer only.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Token Status</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: status.connected ? '#059669' : '#e11d48' }}>
            {status.connected ? "Connected" : "Disconnected"}
          </div>
          <div style={{ fontSize: 14, color: '#64748b' }}>{status.connected ? "OAuth active" : "Awaiting OAuth"}</div>
        </div>
        
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Environment</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{sandbox ? "Sandbox" : "Production"}</div>
          <button 
            onClick={toggleSandbox} 
            style={{ alignSelf: 'flex-start', fontSize: 14, fontWeight: 700, color: '#fe2c55', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            aria-label={`Switch to ${sandbox ? 'Production' : 'Sandbox'} mode`}
          >
            Switch Mode
          </button>
          <div style={{ fontSize: 13, color: "#94a3b8" }}>
            <InlineTip text="Use Sandbox for testing. Switch to Production when approved by TikTok." />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Token Expiry</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>
            {status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : "—"}
          </div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Auto-refresh enabled</div>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Export UI Preview</h2>
        <p style={{ fontSize: 16, color: '#64748b' }}>This preview is required by TikTok to be shown before initiating uploads.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>
              DRAFT CAPTION
              <textarea style={{ ...inputStyle, minHeight: 120 }} defaultValue="Draft caption placeholder" />
            </label>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>
              VISIBILITY
              <select style={inputStyle}>
                <option>Public</option>
                <option>Friends</option>
                <option>Private</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 32, backgroundColor: '#f8fafc', borderRadius: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Permissions</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: '#1e293b', fontWeight: 500 }}>
              <input type="checkbox" defaultChecked style={{ width: 20, height: 20, accentColor: '#fe2c55' }} /> Allow comments
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: '#1e293b', fontWeight: 500 }}>
              <input type="checkbox" defaultChecked style={{ width: 20, height: 20, accentColor: '#fe2c55' }} /> Allow duet
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: '#1e293b', fontWeight: 500 }}>
              <input type="checkbox" defaultChecked style={{ width: 20, height: 20, accentColor: '#fe2c55' }} /> Allow stitch
            </label>
            <div style={{ marginTop: 12, padding: '12px 16px', backgroundColor: '#fff', borderRadius: 12, fontSize: 13, color: '#64748b', border: '1px solid #e2e8f0' }}>
              These settings are synced with your TikTok account preferences.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
