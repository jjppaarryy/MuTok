"use client";

import Link from "next/link";

type InspoItem = {
  id: string;
  sourceId: string | null;
  assetType: string | null;
  copyRewrite: string | null;
  purposeTags: string[] | null;
  themeTags: string[] | null;
  stats: Record<string, number | null> | null;
  createdAt: string;
};

type InspoTableProps = {
  items: InspoItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: "0 8px"
};

const headerStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "8px 12px"
};

const rowStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 14,
  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.06)"
};

const cellStyle: React.CSSProperties = {
  padding: "14px 12px",
  fontSize: 14,
  color: "#0f172a"
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 999,
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 12,
  fontWeight: 600,
  marginRight: 6
};

const getViews = (stats: Record<string, number | null> | null) =>
  stats?.views ?? stats?.likes ?? null;

export default function InspoTable({ items, selected, onToggle }: InspoTableProps) {
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={headerStyle} />
          <th style={headerStyle}>Source id</th>
          <th style={headerStyle}>Asset type</th>
          <th style={headerStyle}>Caption</th>
          <th style={headerStyle}>Purpose</th>
          <th style={headerStyle}>Themes</th>
          <th style={headerStyle}>Views</th>
          <th style={headerStyle}>Created</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} style={rowStyle}>
            <td style={{ ...cellStyle, width: 40 }}>
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => onToggle(item.id)}
                style={{ width: 18, height: 18, accentColor: "#0f172a" }}
              />
            </td>
            <td style={cellStyle}>
              <Link href={`/inspo/${item.id}`} style={{ fontWeight: 700, color: "#0f172a" }}>
                {item.sourceId ?? "—"}
              </Link>
            </td>
            <td style={cellStyle}>{item.assetType ?? "—"}</td>
            <td style={{ ...cellStyle, maxWidth: 360 }}>
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.copyRewrite ?? "—"}
              </div>
            </td>
            <td style={cellStyle}>
              {(item.purposeTags ?? []).map((tag) => (
                <span key={tag} style={pillStyle}>
                  {tag}
                </span>
              ))}
            </td>
            <td style={cellStyle}>
              {(item.themeTags ?? []).map((tag) => (
                <span key={tag} style={pillStyle}>
                  {tag}
                </span>
              ))}
            </td>
            <td style={cellStyle}>{getViews(item.stats) ?? "—"}</td>
            <td style={cellStyle}>{new Date(item.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
