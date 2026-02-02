import ArmTable from "./ArmTable";

type OptimizerTablesProps = {
  showTables: boolean;
  onToggle: () => void;
  filter: string;
  onFilterChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  typeLabel: Record<string, string>;
  types: string[];
  getRows: (type: string) => Array<{
    id: string;
    armType: string;
    armId: string;
    name: string;
    status: string;
    pulls: number;
    impressions: number;
    meanReward: number;
    confidence: number;
    lastUsedAt: string | null;
  }>;
};

export default function OptimizerTables({
  showTables,
  onToggle,
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  typeLabel,
  types,
  getRows
}: OptimizerTablesProps) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onToggle}
          style={{
            padding: "10px 16px",
            borderRadius: 999,
            border: "1px solid #e2e8f0",
            background: "white",
            fontWeight: 700,
            color: "#0f172a",
            cursor: "pointer"
          }}
        >
          {showTables ? "Hide data tables" : "Show data tables"}
        </button>
      </div>

      {showTables ? (
        <>
          <section style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>
              Show
              <select
                value={filter}
                onChange={(event) => onFilterChange(event.target.value)}
                style={{ marginLeft: 12, padding: "8px 12px", borderRadius: 12, border: "1px solid #e2e8f0" }}
              >
                {["ALL", "RECIPE", "CTA", "VARIANT", "CONTAINER", "CLIP", "SNIPPET"].map((option) => (
                  <option key={option} value={option}>
                    {typeLabel[option] ?? option}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>
              Sort by
              <select
                value={sortBy}
                onChange={(event) => onSortChange(event.target.value)}
                style={{ marginLeft: 12, padding: "8px 12px", borderRadius: 12, border: "1px solid #e2e8f0" }}
              >
                <option value="confidence_adjusted">Best overall</option>
                <option value="confidence">Confidence</option>
                <option value="reward">Performance</option>
                <option value="pulls">Sample size</option>
              </select>
            </label>
          </section>

          {types.map((type) => (
            <ArmTable key={type} title={typeLabel[type] ?? type} rows={getRows(type)} />
          ))}
        </>
      ) : null}
    </>
  );
}
