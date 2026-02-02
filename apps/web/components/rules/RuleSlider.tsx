import { inputStyle, labelStyle } from "./rulesStyles";

type RuleSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  helper?: string;
  suffix?: string;
  onChange: (value: number) => void;
};

export default function RuleSlider({
  label,
  value,
  min,
  max,
  step = 1,
  helper,
  suffix,
  onChange
}: RuleSliderProps) {
  return (
    <label style={labelStyle}>
      {label}
      {helper ? (
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
          {helper}
        </div>
      ) : null}
      <div className="rule-slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          style={inputStyle}
        />
        {suffix ? <span style={{ fontSize: 13, color: "#64748b" }}>{suffix}</span> : null}
      </div>
    </label>
  );
}
