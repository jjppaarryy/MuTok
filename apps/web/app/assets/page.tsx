"use client";

import { useEffect, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InlineTip from "../../components/InlineTip";
import PageHeader from "../../components/PageHeader";
import ClipSetsSection from "../../components/assets/ClipSetsSection";
import ClipTagsSection from "../../components/assets/ClipTagsSection";
import TrackSnippetsSection from "../../components/assets/TrackSnippetsSection";

type Clip = {
  id: string;
  filePath: string;
  category: string;
  sync: string;
  createdAt?: string;
  clipSetItems?: {
    clipSetId: string;
    clipSet: {
      id: string;
      name: string;
    };
  }[];
};
type ClipSet = {
  id: string;
  name: string;
  clipItems?: { clipId: string; clipSetId: string }[];
};
type Snippet = {
  id: string;
  startSec: number;
  durationSec: number;
  energyScore: number;
  section?: string | null;
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
  const [clipSets, setClipSets] = useState<ClipSet[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [trackFile, setTrackFile] = useState<File | null>(null);
  const [trackUploadMessage, setTrackUploadMessage] = useState<string | null>(null);
  const [trackUploadError, setTrackUploadError] = useState<string | null>(null);

  const safeJson = async <T,>(response: Response): Promise<T | null> => {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  };

  const refreshClips = async () => {
    const response = await fetch("/api/assets/clip");
    const data = await safeJson<{ clips: Clip[] }>(response);
    setClips(data?.clips ?? []);
  };

  const refreshClipSets = async () => {
    const response = await fetch("/api/assets/clip-sets");
    const data = await safeJson<{ clipSets: ClipSet[] }>(response);
    setClipSets(data?.clipSets ?? []);
  };
  const refreshTracks = async () => {
    const response = await fetch("/api/assets/track");
    const data = await safeJson<{ tracks: Track[] }>(response);
    setTracks(data?.tracks ?? []);
  };

  useEffect(() => {
    void refreshClips();
    void refreshClipSets();
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
    setTrackUploadMessage(null);
    setTrackUploadError(null);
    const form = new FormData();
    form.append("file", trackFile);
    form.append("title", trackFile.name);
    try {
      const response = await fetch("/api/assets/track", {
        method: "POST",
        body: form
      });
      if (!response.ok) {
        const text = await response.text();
        let message = "Track upload failed.";
        try {
          const parsed = text ? (JSON.parse(text) as { error?: string }) : null;
          if (parsed?.error) message = parsed.error;
        } catch {
          if (text) message = text;
        }
        setTrackUploadError(message);
        return;
      }
      setTrackFile(null);
      await refreshTracks();
      setTrackUploadMessage("Track uploaded.");
    } catch (error) {
      setTrackUploadError(error instanceof Error ? error.message : "Track upload failed.");
    }
  };

  const updateClip = async (
    id: string,
    updates: Partial<Clip> & { clipSetIds?: string[] | null }
  ) => {
    await fetch(`/api/assets/clip/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    await refreshClips();
    await refreshClipSets();
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

  const addSnippet = async (
    trackId: string,
    startSec: number,
    durationSec: number,
    section: string | null
  ) => {
    const response = await fetch(`/api/assets/track/${trackId}/snippets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startSec, durationSec, section })
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

  const createClipSet = async (name: string) => {
    await fetch("/api/assets/clip-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    await refreshClipSets();
  };

  const renameClipSet = async (id: string, name: string) => {
    await fetch(`/api/assets/clip-sets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    await refreshClipSets();
  };

  const deleteClipSet = async (id: string) => {
    if (!window.confirm("Delete this clip set? Clips stay, only the group is removed.")) return;
    await fetch(`/api/assets/clip-sets/${id}`, { method: "DELETE" });
    await refreshClipSets();
    await refreshClips();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      <PageHeader
        title="Library"
        description="Upload clips and tracks so drafts can be built."
        tip="Step 2: add clips, add tracks, then approve snippets."
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748b" }}>
        Upload files, tag clips, then approve the snippets you want used.
        <InlineTip text="Snippets are short moments from your tracks." />
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Upload clips</h2>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 24 }}>Add MP4 or MOV files for your visuals.</p>
          
          <form onSubmit={uploadClip} style={inputWrapperStyle}>
            <input
              style={fileInputStyle}
              type="file"
              accept="video/mp4,video/quicktime"
              onChange={(event) => setClipFile(event.target.files?.[0] ?? null)}
            />
            <ActionButton
              label="Add clip"
              type="submit"
              disabled={!clipFile}
              title="Add this video clip to your library."
            />
          </form>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Upload tracks</h2>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 24 }}>Add WAV or MP3 music for your posts.</p>
          
          <form onSubmit={uploadTrack} style={inputWrapperStyle}>
            <input
              style={fileInputStyle}
              type="file"
              accept="audio/mpeg,audio/wav"
              onChange={(event) => setTrackFile(event.target.files?.[0] ?? null)}
            />
            <ActionButton
              label="Add track"
              type="submit"
              disabled={!trackFile}
              title="Add this music file to your library."
            />
            {trackUploadMessage || trackUploadError ? (
              <div style={{ fontSize: 13, color: trackUploadError ? "#b91c1c" : "#059669" }}>
                {trackUploadError ?? trackUploadMessage}
              </div>
            ) : null}
          </form>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 40 }}>
        <ClipSetsSection
          clipSets={clipSets}
          onCreate={createClipSet}
          onRename={renameClipSet}
          onDelete={deleteClipSet}
        />
        <ClipTagsSection
          clips={clips}
          clipSets={clipSets}
          onUpdate={updateClip}
          onDelete={deleteClip}
        />
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
