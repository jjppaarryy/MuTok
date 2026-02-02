import { CTA_LABELS, CTA_OPTIONS } from "./recipeTypes";
import { inputStyle, labelStyle } from "./recipesStyles";

type Props = {
  filterStatus: "all" | "active" | "archived";
  filterCta: string;
  filterContainer: string;
  search: string;
  onStatusChange: (value: "all" | "active" | "archived") => void;
  onCtaChange: (value: string) => void;
  onContainerChange: (value: string) => void;
  onSearchChange: (value: string) => void;
};

export default function RecipesFilters({
  filterStatus,
  filterCta,
  filterContainer,
  search,
  onStatusChange,
  onCtaChange,
  onContainerChange,
  onSearchChange
}: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <label style={labelStyle}>
        Hook status
        <select
          style={inputStyle}
          value={filterStatus}
          onChange={(event) => onStatusChange(event.target.value as Props["filterStatus"])}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <label style={labelStyle}>
        CTA intent
        <select style={inputStyle} value={filterCta} onChange={(event) => onCtaChange(event.target.value)}>
          <option value="all">All</option>
          {CTA_OPTIONS.map((cta) => (
            <option key={cta} value={cta}>
              {CTA_LABELS[cta] ?? cta}
            </option>
          ))}
        </select>
      </label>
      <label style={labelStyle}>
        Container
        <select
          style={inputStyle}
          value={filterContainer}
          onChange={(event) => onContainerChange(event.target.value)}
        >
          <option value="all">All</option>
          <option value="static_daw">Static DAW</option>
          <option value="montage">Montage</option>
          <option value="both">Both</option>
        </select>
      </label>
      <label style={labelStyle}>
        Search hooks
        <input style={inputStyle} value={search} onChange={(event) => onSearchChange(event.target.value)} />
      </label>
    </div>
  );
}
