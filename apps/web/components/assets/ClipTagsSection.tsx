import { useMemo, useState } from "react";
import ClipCard from "./ClipCard";
import ActionButton from "../ActionButton";
import { clipMomentLabels, normalizeClipCategory } from "../../lib/clipCategories";

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
};

type ClipTagsSectionProps = {
  clips: Clip[];
  clipSets: ClipSet[];
  onUpdate: (id: string, updates: Partial<Clip> & { clipSetIds?: string[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const searchInputStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  width: "100%",
  fontSize: 14,
  color: "#0f172a"
};

export default function ClipTagsSection({
  clips,
  clipSets,
  onUpdate,
  onDelete
}: ClipTagsSectionProps) {
  const [clipSearch, setClipSearch] = useState<string>("");
  const [clipPage, setClipPage] = useState<number>(1);
  const [clipCategory, setClipCategory] = useState<string>("all");
  const [clipSetFilter, setClipSetFilter] = useState<string>("all");
  const [clipSync, setClipSync] = useState<string>("all");
  const [clipSort, setClipSort] = useState<string>("newest");
  const [compactView, setCompactView] = useState<boolean>(false);

  const filteredClips = useMemo(() => {
    const normalizedQuery = clipSearch.trim().toLowerCase();
    return clips
      .filter((clip) => {
        if (!normalizedQuery) return true;
        const clipSetNames = (clip.clipSetItems ?? [])
          .map((item) => item.clipSet?.name ?? "")
          .join(" ");
        const categoryLabel = clipMomentLabels[normalizeClipCategory(clip.category)];
        return (
          clip.filePath.toLowerCase().includes(normalizedQuery) ||
          clip.category.toLowerCase().includes(normalizedQuery) ||
          categoryLabel.toLowerCase().includes(normalizedQuery) ||
          clipSetNames.toLowerCase().includes(normalizedQuery)
        );
      })
      .filter((clip) =>
        clipCategory === "all"
          ? true
          : normalizeClipCategory(clip.category) === clipCategory
      )
      .filter((clip) =>
        clipSetFilter === "all"
          ? true
          : (clip.clipSetItems ?? []).some((item) => item.clipSetId === clipSetFilter)
      )
      .filter((clip) => (clipSync === "all" ? true : clip.sync === clipSync));
  }, [clips, clipSearch, clipCategory, clipSetFilter, clipSync]);

  const sortedClips = useMemo(() => {
    return [...filteredClips].sort((a, b) => {
      if (clipSort === "name") {
        return a.filePath.localeCompare(b.filePath);
      }
      if (clipSort === "oldest") {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return at - bt;
      }
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }, [filteredClips, clipSort]);

  const perPage = compactView ? 20 : 12;
  const totalPages = Math.max(1, Math.ceil(filteredClips.length / perPage));
  const page = Math.min(clipPage, totalPages);
  const pagedClips = sortedClips.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 24 }}>
        Clip Tags
      </h2>
      {clips.length === 0 ? (
        <div style={{ textAlign: "center", color: "#64748b" }} className="card dashboard-card">
          No clips uploaded yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <input
              style={{ ...searchInputStyle, maxWidth: 360 }}
              placeholder="Search clips"
              value={clipSearch}
              onChange={(event) => {
                setClipSearch(event.target.value);
                setClipPage(1);
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <select
                style={{ ...searchInputStyle, width: 140 }}
                value={clipCategory}
                onChange={(event) => {
                  setClipCategory(event.target.value);
                  setClipPage(1);
                }}
              >
                <option value="all">All moments</option>
                <option value="calm">Calm (no drums)</option>
                <option value="build">Build (rising)</option>
                <option value="peak">Peak (drums)</option>
                <option value="neutral">Neutral</option>
              </select>
              <select
                style={{ ...searchInputStyle, width: 140 }}
                value={clipSetFilter}
                onChange={(event) => {
                  setClipSetFilter(event.target.value);
                  setClipPage(1);
                }}
              >
                <option value="all">All clip sets</option>
                {clipSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>
              <select
                style={{ ...searchInputStyle, width: 120 }}
                value={clipSync}
                onChange={(event) => {
                  setClipSync(event.target.value);
                  setClipPage(1);
                }}
              >
                <option value="all">All sync</option>
                <option value="safe">Safe</option>
                <option value="sensitive">Sensitive</option>
                <option value="critical">Critical</option>
              </select>
              <select
                style={{ ...searchInputStyle, width: 140 }}
                value={clipSort}
                onChange={(event) => setClipSort(event.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
              </select>
              <ActionButton
                label={compactView ? "Roomy" : "Compact"}
                variant="ghost"
                onClick={() => setCompactView((prev) => !prev)}
                title="Toggle card size"
              />
              <div style={{ fontSize: 13, color: "#64748b", minWidth: 90, textAlign: "right" }}>
                {filteredClips.length} clips
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 24
            }}
          >
            {pagedClips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                clipSets={clipSets}
                onUpdate={onUpdate}
                onDelete={onDelete}
                compact={compactView}
              />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
            <ActionButton
              label="Previous"
              variant="ghost"
              onClick={() => setClipPage(Math.max(1, page - 1))}
              disabled={page <= 1}
            />
            <div style={{ fontSize: 14, color: "#64748b" }}>
              Page {page} of {totalPages}
            </div>
            <ActionButton
              label="Next"
              variant="ghost"
              onClick={() => setClipPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            />
          </div>
        </div>
      )}
    </div>
  );
}
