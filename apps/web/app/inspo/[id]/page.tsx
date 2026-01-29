"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ActionButton from "../../../components/ActionButton";
import PageHeader from "../../../components/PageHeader";

type SeedPattern = {
  core_mechanic?: string;
  hook_family?: string;
  copyTemplate?: string;
  isActive?: boolean;
  music_first_variants?: Array<{ beat1?: string; beat2?: string; caption?: string }>;
};

type InspoItem = {
  id: string;
  source: string;
  sourceId: string | null;
  title: string | null;
  linkOriginal: string | null;
  copyRewrite: string | null;
  whyItWorks: string | null;
  description: string | null;
  howToUse: string | null;
  stats: Record<string, number | null> | null;
  themeTags: string[] | null;
  purposeTags: string[] | null;
  hashtags: string[] | null;
  seedPatterns: SeedPattern | SeedPattern[] | null;
  favorite: boolean;
};

// Helper to normalize seedPatterns to always be an array
const getSeedPatternsArray = (patterns: SeedPattern | SeedPattern[] | null): SeedPattern[] => {
  if (!patterns) return [];
  if (Array.isArray(patterns)) return patterns;
  return [patterns];
};

const cardStyle: React.CSSProperties = {
  padding: 28,
  borderRadius: 20,
  background: "white",
  border: "1px solid #e2e8f0",
  display: "grid",
  gap: 14
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};

export default function InspoDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<InspoItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const inspoId = Array.isArray(params?.id) ? params?.id[0] : params?.id ?? "";

  const loadItem = async () => {
    if (!inspoId) {
      setLoading(false);
      return;
    }
    const response = await fetch(`/api/inspo/${inspoId}`);
    const raw = await response.text();
    if (!response.ok || !raw) {
      setItem(null);
      setLoading(false);
      return;
    }
    const data = JSON.parse(raw) as { item: InspoItem };
    setItem(data.item ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void loadItem();
  }, [inspoId]);

  const seedItem = async () => {
    setMessage(null);
    if (!inspoId) return;
    await fetch(`/api/inspo/${inspoId}/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "patterns", targetGenre: "melodic_techno_trance" })
    });
    setMessage("Seeded recipes from this inspo item.");
  };

  const generateVariants = async () => {
    setMessage(null);
    if (!inspoId) return;
    const response = await fetch(`/api/inspo/${inspoId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 5 })
    });
    const data = (await response.json()) as { item?: InspoItem };
    if (data.item) setItem(data.item);
    setMessage("Generated seed variants from copy.");
  };

  const copyVariants = async () => {
    if (!item?.seedPatterns) return;
    await navigator.clipboard.writeText(JSON.stringify(item.seedPatterns, null, 2));
    setMessage("Copied variants JSON.");
  };

  const toggleFavorite = async () => {
    if (!item) return;
    if (!inspoId) return;
    const response = await fetch(`/api/inspo/${inspoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !item.favorite })
    });
    const data = (await response.json()) as { item: InspoItem };
    setItem(data.item ?? item);
  };

  if (loading) return <div>Loading...</div>;
  if (!item) return <div>Inspo item not found.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title={item.title ?? `Inspo ${item.sourceId ?? item.id}`}
        description={item.source}
        actions={
          <div style={{ display: "flex", gap: 12 }}>
            <ActionButton label="Seed recipes from this" onClick={seedItem} />
            <ActionButton label="Generate variants from copy" variant="secondary" onClick={generateVariants} />
            <ActionButton label="Copy adapted variants JSON" variant="secondary" onClick={copyVariants} />
            <ActionButton label={item.favorite ? "Unfavourite" : "Mark as favourite"} variant="secondary" onClick={toggleFavorite} />
          </div>
        }
      />

      {message ? (
        <div style={{ padding: 16, borderRadius: 14, background: "#ecfdf5", color: "#047857", fontWeight: 600 }}>
          {message}
        </div>
      ) : null}

      <section style={cardStyle}>
        <div style={labelStyle}>Copy rewrite</div>
        <div style={{ fontSize: 16, color: "#0f172a" }}>{item.copyRewrite ?? "—"}</div>
      </section>

      <section style={cardStyle}>
        <div style={labelStyle}>Why it works</div>
        <div style={{ fontSize: 15, color: "#0f172a" }}>{item.whyItWorks ?? "—"}</div>
      </section>

      <section style={cardStyle}>
        <div style={labelStyle}>How to use</div>
        <div style={{ fontSize: 15, color: "#0f172a" }}>{item.howToUse ?? "—"}</div>
      </section>

      <section style={cardStyle}>
        <div style={labelStyle}>Stats</div>
        <div style={{ display: "flex", gap: 16, fontSize: 14, color: "#334155" }}>
          <span>Views: {item.stats?.views ?? "—"}</span>
          <span>Likes: {item.stats?.likes ?? "—"}</span>
          <span>Comments: {item.stats?.comments ?? "—"}</span>
          <span>Shares: {item.stats?.shares ?? "—"}</span>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={labelStyle}>Tags</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 13 }}>
          {(item.themeTags ?? []).map((tag) => (
            <span key={tag} style={{ background: "#f1f5f9", padding: "6px 12px", borderRadius: 999 }}>
              {tag}
            </span>
          ))}
          {(item.purposeTags ?? []).map((tag) => (
            <span key={tag} style={{ background: "#f1f5f9", padding: "6px 12px", borderRadius: 999 }}>
              {tag}
            </span>
          ))}
          {(item.hashtags ?? []).map((tag) => (
            <span key={tag} style={{ background: "#f1f5f9", padding: "6px 12px", borderRadius: 999 }}>
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <div style={labelStyle}>Seed patterns</div>
        <div style={{ display: "grid", gap: 12 }}>
          {getSeedPatternsArray(item.seedPatterns).map((pattern, index) => (
            <div key={`${pattern.core_mechanic ?? pattern.copyTemplate ?? "pattern"}-${index}`} style={{ padding: 12, borderRadius: 14, background: "#f8fafc" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {pattern.core_mechanic ?? pattern.hook_family ?? pattern.copyTemplate ?? "Seed pattern"}
              </div>
              {pattern.copyTemplate && (
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                  Template: {pattern.copyTemplate}
                </div>
              )}
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Variants: {pattern.music_first_variants?.length ?? 0}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <div style={labelStyle}>Original link</div>
        {item.linkOriginal ? (
          <a href={item.linkOriginal} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
            {item.linkOriginal}
          </a>
        ) : (
          "—"
        )}
      </section>
    </div>
  );
}
