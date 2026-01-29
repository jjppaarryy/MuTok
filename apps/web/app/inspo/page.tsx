"use client";

import { useEffect, useMemo, useState } from "react";
import ActionButton from "../../components/ActionButton";
import InspoImportModal from "../../components/inspo/InspoImportModal";
import InspoFormModal from "../../components/inspo/InspoFormModal";
import InspoTable from "../../components/inspo/InspoTable";
import PageHeader from "../../components/PageHeader";

type SeedPatterns = {
  copyTemplate?: string;
  isActive?: boolean;
  core_mechanic?: string;
} | Array<{ core_mechanic?: string }>;

type InspoItem = {
  id: string;
  sourceId: string | null;
  assetType: string | null;
  contentType: string | null;
  copyRewrite: string | null;
  purposeTags: string[] | null;
  themeTags: string[] | null;
  stats: Record<string, number | null> | null;
  createdAt: string;
  seedPatterns: SeedPatterns | null;
};

const inputStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: "10px 12px",
  fontSize: 14,
  outline: "none"
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};

export default function InspoPage() {
  const [items, setItems] = useState<InspoItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [assetType, setAssetType] = useState("");
  const [contentType, setContentType] = useState("");
  const [purposeTags, setPurposeTags] = useState<string[]>([]);
  const [themeTags, setThemeTags] = useState<string[]>([]);
  const [mechanic, setMechanic] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadInspo = async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (assetType) params.set("assetType", assetType);
    if (contentType) params.set("contentType", contentType);
    if (purposeTags.length) params.set("purpose", purposeTags.join(","));
    if (themeTags.length) params.set("theme", themeTags.join(","));
    if (mechanic) params.set("mechanic", mechanic);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", "25");

    const response = await fetch(`/api/inspo?${params.toString()}`);
    const data = (await response.json()) as { items: InspoItem[]; total: number };
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
  };

  useEffect(() => {
    void loadInspo();
  }, [search, assetType, contentType, purposeTags, themeTags, mechanic, sort, page]);

  const tagOptions = useMemo(() => {
    const purposes = new Set<string>();
    const themes = new Set<string>();
    const mechanics = new Set<string>();
    items.forEach((item) => {
      (item.purposeTags ?? []).forEach((tag) => purposes.add(tag));
      (item.themeTags ?? []).forEach((tag) => themes.add(tag));
      
      // Handle seedPatterns as either array or object
      const patterns = item.seedPatterns;
      if (patterns) {
        if (Array.isArray(patterns)) {
          patterns.forEach((pattern) => {
            if (pattern.core_mechanic) mechanics.add(pattern.core_mechanic);
          });
        } else if (typeof patterns === "object" && patterns.core_mechanic) {
          mechanics.add(patterns.core_mechanic);
        }
      }
    });
    return {
      purposes: Array.from(purposes),
      themes: Array.from(themes),
      mechanics: Array.from(mechanics)
    };
  }, [items]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seedSelected = async () => {
    if (selected.size === 0) return;
    setMessage(null);
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/inspo/${id}/seed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "patterns", targetGenre: "melodic_techno_trance" })
        })
      )
    );
    setMessage(`Seeded ${ids.length} inspo items.`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <PageHeader
        title="Inspo Library"
        description="Store and reuse TikTok inspiration as hook seeds."
        actions={
          <div style={{ display: "flex", gap: 12 }}>
            <ActionButton label="Import JSON" onClick={() => setShowImport(true)} />
            <ActionButton label="Add item" variant="secondary" onClick={() => setShowForm(true)} />
          </div>
        }
      />

      {message ? (
        <div style={{ padding: 16, borderRadius: 14, background: "#ecfdf5", color: "#047857", fontWeight: 600 }}>
          {message}
        </div>
      ) : null}

      <section style={{ display: "grid", gap: 16, padding: 24, borderRadius: 20, background: "white", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(2, 1fr)", gap: 12 }}>
          <label style={labelStyle}>
            Search
            <input style={inputStyle} value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label style={labelStyle}>
            Asset type
            <select style={inputStyle} value={assetType} onChange={(e) => setAssetType(e.target.value)}>
              <option value="">All</option>
              {Array.from(new Set(items.map((item) => item.assetType).filter(Boolean))).map((value) => (
                <option key={value} value={value ?? ""}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Content type
            <select style={inputStyle} value={contentType} onChange={(e) => setContentType(e.target.value)}>
              <option value="">All</option>
              {Array.from(new Set(items.map((item) => item.contentType).filter(Boolean))).map((value) => (
                <option key={value} value={value ?? ""}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <label style={labelStyle}>
            Purpose tags
            <select
              style={{ ...inputStyle, minHeight: 42 }}
              multiple
              value={purposeTags}
              onChange={(e) =>
                setPurposeTags(Array.from(e.target.selectedOptions).map((option) => option.value))
              }
            >
              {tagOptions.purposes.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Theme tags
            <select
              style={{ ...inputStyle, minHeight: 42 }}
              multiple
              value={themeTags}
              onChange={(e) =>
                setThemeTags(Array.from(e.target.selectedOptions).map((option) => option.value))
              }
            >
              {tagOptions.themes.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Mechanic
            <select style={inputStyle} value={mechanic} onChange={(e) => setMechanic(e.target.value)}>
              <option value="">All</option>
              {tagOptions.mechanics.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ ...labelStyle, display: "grid" }}>
            Sort
            <select style={inputStyle} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Created newest</option>
              <option value="views">Views high</option>
              <option value="likes">Likes high</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <ActionButton label="Seed selected" onClick={seedSelected} />
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        <InspoTable items={items} selected={selected} onToggle={toggleSelect} />
        <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 13 }}>
          <span>{total} items</span>
          <div style={{ display: "flex", gap: 8 }}>
            <ActionButton label="Prev" variant="secondary" onClick={() => setPage(Math.max(1, page - 1))} />
            <ActionButton label="Next" variant="secondary" onClick={() => setPage(page + 1)} />
          </div>
        </div>
      </section>

      <InspoImportModal open={showImport} onClose={() => setShowImport(false)} onImported={loadInspo} />
      <InspoFormModal open={showForm} onClose={() => setShowForm(false)} onSaved={loadInspo} />
    </div>
  );
}
