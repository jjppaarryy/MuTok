import { useMemo, useState } from "react";
import ActionButton from "../ActionButton";

type ClipSet = {
  id: string;
  name: string;
  clipItems?: { clipId: string; clipSetId: string }[];
};

type ClipSetsSectionProps = {
  clipSets: ClipSet[];
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  fontSize: 14,
  color: "#0f172a"
};

export default function ClipSetsSection({
  clipSets,
  onCreate,
  onRename,
  onDelete
}: ClipSetsSectionProps) {
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const sortedSets = useMemo(
    () => [...clipSets].sort((a, b) => a.name.localeCompare(b.name)),
    [clipSets]
  );

  const handleRename = async (id: string) => {
    const value = (drafts[id] ?? "").trim();
    if (!value) return;
    await onRename(id, value);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
        Clip Sets
      </h2>
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
        Group clips that should stay visually consistent (lighting, outfit, location). The planner
        will keep clips from the same set together.
      </div>
      <div
        className="card dashboard-card"
        style={{ display: "grid", gap: 12, padding: 20, marginBottom: 16 }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <input
            style={{ ...inputStyle, minWidth: 240 }}
            placeholder="New clip set name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <ActionButton
            label="Create set"
            onClick={async () => {
              const name = newName.trim();
              if (!name) return;
              await onCreate(name);
              setNewName("");
            }}
          />
        </div>
      </div>
      {sortedSets.length === 0 ? (
        <div style={{ textAlign: "center", color: "#64748b" }} className="card dashboard-card">
          No clip sets yet. Create one above to get started.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {sortedSets.map((set) => (
            <div
              key={set.id}
              className="card dashboard-card"
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                padding: 18
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <input
                  style={inputStyle}
                  value={drafts[set.id] ?? set.name}
                  onChange={(event) =>
                    setDrafts((prev) => ({ ...prev, [set.id]: event.target.value }))
                  }
                />
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  {set.clipItems?.length ?? 0} clips assigned
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <ActionButton
                  label="Save"
                  variant="secondary"
                  onClick={() => handleRename(set.id)}
                />
                <ActionButton
                  label="Delete"
                  variant="ghost"
                  onClick={() => onDelete(set.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
