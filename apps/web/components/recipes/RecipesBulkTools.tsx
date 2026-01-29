import { cardStyle, inputStyle } from "./recipesStyles";

type Props = {
  importText: string;
  onImportTextChange: (value: string) => void;
};

export default function RecipesBulkTools({ importText, onImportTextChange }: Props) {
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 18, fontWeight: 700 }}>Bulk import/export</h3>
      <textarea
        style={{ ...inputStyle, minHeight: 180, fontFamily: "ui-monospace, monospace" }}
        value={importText}
        onChange={(event) => onImportTextChange(event.target.value)}
        placeholder="Paste JSON here to import."
      />
    </div>
  );
}
