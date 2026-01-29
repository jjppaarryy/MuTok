"use client";

import { useEffect, useState } from "react";

type RunLog = {
  id: string;
  runType: string;
  status: string;
  startedAt: string;
  error?: string | null;
  payloadExcerpt?: string | null;
};

const cardStyle: React.CSSProperties = {
  padding: 48,
  borderRadius: 24,
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  gap: 20
};

const statusBadgeStyle = (status: string): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 50,
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  backgroundColor: status === 'SUCCESS' ? '#ecfdf5' : '#fff1f2',
  color: status === 'SUCCESS' ? '#065f46' : '#e11d48',
  border: status === 'SUCCESS' ? '1px solid #a7f3d0' : '1px solid #fecaca'
});

export default function LogsPage() {
  const [logs, setLogs] = useState<RunLog[]>([]);

  const loadLogs = async () => {
    const response = await fetch("/api/logs");
    const data = (await response.json()) as { logs: RunLog[] };
    setLogs(data.logs ?? []);
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <header>
        <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, marginBottom: 12, color: '#0f172a' }}>Run Logs</h1>
        <p style={{ fontSize: 17, color: '#64748b' }}>
          Recent task runs, errors, and debug payloads.
        </p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {logs.length === 0 ? (
          <div style={{ ...cardStyle, fontSize: 16, color: '#94a3b8', textAlign: 'center' }}>
            No logs available yet.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{log.runType}</div>
                <div style={statusBadgeStyle(log.status)}>{log.status}</div>
              </div>
              
              <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#cbd5e1' }}></span>
                Started: {new Date(log.startedAt).toLocaleString()}
              </div>

              {log.error ? (
                <div style={{ marginTop: 12, padding: 24, borderRadius: 16, backgroundColor: '#fff1f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 15, fontWeight: 500, lineHeight: 1.6 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, textTransform: 'uppercase' }}>Error Message</div>
                  {log.error}
                </div>
              ) : null}

              {log.payloadExcerpt ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12, color: '#64748b', textTransform: 'uppercase' }}>Payload Debug</div>
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    padding: 24, 
                    borderRadius: 16, 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    fontSize: 13, 
                    color: '#334155', 
                    lineHeight: 1.6,
                    fontFamily: 'ui-monospace, monospace'
                  }}>
                    {log.payloadExcerpt}
                  </pre>
                </div>
              ) : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
