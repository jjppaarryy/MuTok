"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InlineTip from "../../components/InlineTip";
import PageHeader from "../../components/PageHeader";
import ClipTagsSection from "../../components/assets/ClipTagsSection";
import TrackSnippetsSection from "../../components/assets/TrackSnippetsSection";

type Clip = {
  id: string;
  filePath: string;
  category: string;
  energy: number;
  motion: string;
  sync: string;
  vibe: string;
  createdAt?: string;
};

type Snippet = {
  id: string;
  startSec: number;
  durationSec: number;
  energyScore: number;
  energy?: number | null;
  section?: string | null;
  vibe?: string | null;
  approved: boolean;
};

type Track = {
  id: string;
  filePath: string;
  title: string;
  bpm?: number | null;
  key?: string | null;
  durationSec?: number | null;
  snippets: Snippet[];
};

const cardStyle: React.CSSProperties = {
  padding: 40,
  borderRadius: 24,
  backgroundColor: 'white',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
};

const inputWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  marginTop: 24
};

const fileInputStyle: React.CSSProperties = {
  padding: '12px 20px',
  borderRadius: 12,
  border: '2px dashed #cbd5e1',
  backgroundColor: '#f8fafc',
  cursor: 'pointer',
  width: '100%',
  fontSize: 14
};

export default function AssetsPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [trackFile, setTrackFile] = useState<File | null>(null);

  const refreshClips = async () => {
    const response = await fetch("/api/assets/clip");
    const data = (await response.json()) as { clips: Clip[] };
    setClips(data.clips ?? []);
  };

  const refreshTracks = async () => {
    const response = await fetch("/api/assets/track");
    const data = (await response.json()) as { tracks: Track[] };
    setTracks(data.tracks ?? []);
  };

  useEffect(() => {
    void refreshClips();
    void refreshTracks();
  }, []);

  const uploadClip = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clipFile) return;
    const form = new FormData();
    form.append("file", clipFile);
    const response = await fetch("/api/assets/clip", {
      method: "POST",
      body: form
    });
    if (response.ok) {
      setClipFile(null);
      await refreshClips();
    }
  };

  const uploadTrack = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trackFile) return;
    const form = new FormData();
    form.append("file", trackFile);
    form.append("title", trackFile.name);
    const response = await fetch("/api/assets/track", {
      method: "POST",
      body: form
    });
    if (response.ok) {
      setTrackFile(null);
      await refreshTracks();
    }
  };

  const updateClip = async (id: string, updates: Partial<Clip>) => {
    await fetch(`/api/assets/clip/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    await refreshClips();
  };

  const deleteClip = async (id: string) => {
    if (!window.confirm("Delete this clip? This cannot be undone.")) return;
    await fetch(`/api/assets/clip/${id}`, { method: "DELETE" });
    await refreshClips();
  };

  const deleteSnippet = async (snippetId: string) => {
    if (!window.confirm("Delete this snippet?")) return;
    await fetch(`/api/assets/snippet/${snippetId}`, { method: "DELETE" });
    await refreshTracks();
  };

  const updateSnippet = async (snippetId: string, updates: Partial<Snippet>) => {
    await fetch(`/api/assets/snippet/${snippetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    await refreshTracks();
  };

  const addSnippet = async (trackId: string, startSec: number, durationSec: number) => {
    const response = await fetch(`/api/assets/track/${trackId}/snippets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startSec, durationSec })
    });
    
    // Handle response safely
    let data: { error?: string; snippets?: unknown[] } = {};
    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
      }
    } catch {
      // If JSON parsing fails, continue with empty data
    }
    
    if (!response.ok) {
      throw new Error(data.error || `Snippet save failed (status ${response.status})`);
    }
    
    await refreshTracks();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <PageHeader
        title="Asset Bank"
        description="Add your video clips and music here."
        tip="Step 2: add clips, add tracks, then approve snippets."
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748b" }}>
        Upload files, tag clips, then approve snippets you like.
        <InlineTip text="Snippets are short music clips. Approve the good ones so the AI can use them." />
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Upload clips</h2>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 24 }}>MP4/MOV clips stored locally under <code style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>/data/clips</code></p>
          
          <form onSubmit={uploadClip} style={inputWrapperStyle}>
            <input
              style={fileInputStyle}
              type="file"
              accept="video/mp4,video/quicktime"
              onChange={(event) => setClipFile(event.target.files?.[0] ?? null)}
            />
            <ActionButton
              label="Upload Clip"
              type="submit"
              disabled={!clipFile}
              title="Add this video clip to your library."
            />
          </form>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Upload tracks</h2>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 24 }}>WAV/MP3 tracks stored locally under <code style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: 6 }}>/data/tracks</code></p>
          
          <form onSubmit={uploadTrack} style={inputWrapperStyle}>
            <input
              style={fileInputStyle}
              type="file"
              accept="audio/mpeg,audio/wav"
              onChange={(event) => setTrackFile(event.target.files?.[0] ?? null)}
            />
            <ActionButton
              label="Upload Track"
              type="submit"
              disabled={!trackFile}
              title="Add this music file to your library."
            />
          </form>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 40 }}>
        <ClipTagsSection clips={clips} onUpdate={updateClip} onDelete={deleteClip} />
        <TrackSnippetsSection
          tracks={tracks}
          onAddSnippet={addSnippet}
          onDeleteSnippet={deleteSnippet}
          onUpdateSnippet={updateSnippet}
        />
      </section>
    </div>
  );
}
