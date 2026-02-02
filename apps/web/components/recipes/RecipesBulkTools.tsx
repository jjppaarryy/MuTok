import { cardStyle, inputStyle } from "./recipesStyles";

type Props = {
  importText: string;
  onImportTextChange: (value: string) => void;
  message?: string | null;
};

export default function RecipesBulkTools({ importText, onImportTextChange, message }: Props) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 18, fontWeight: 700 }}>Bulk import/export</h3>
      <div style={{ fontSize: 13, color: "#64748b" }}>
        Paste JSON here to import. Export fills this box and copies to clipboard.
      </div>
      <textarea
        style={{ ...inputStyle, minHeight: 180, fontFamily: "ui-monospace, monospace" }}
        value={importText}
        onChange={(event) => onImportTextChange(event.target.value)}
        placeholder="Paste JSON here to import."
      />
      {message ? (
        <div style={{ fontSize: 13, color: "#475569", backgroundColor: "#f8fafc", padding: 10, borderRadius: 10 }}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
