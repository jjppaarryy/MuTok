import type { RulesSettings } from "../../lib/rulesConfig";
import RuleSlider from "./RuleSlider";

type Props = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

export default function RulesBasicsSection({ rules, onChange }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Basics
      </h3>
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
        Set your posting pace and how strict the matching should be.
      </div>
      <div className="grid-2" style={{ gap: 24 }}>
        <RuleSlider
          label="Posts per day"
          value={rules.cadence_per_day}
          min={1}
          max={5}
          step={1}
          helper="How many posts the system plans each day."
          onChange={(value) => onChange("cadence_per_day", value)}
        />
        <RuleSlider
          label="Queue size target"
          value={rules.target_queue_size}
          min={1}
          max={10}
          step={1}
          helper="How many drafts to keep ready in the queue."
          onChange={(value) => onChange("target_queue_size", value)}
        />
        <RuleSlider
          label="Explore ratio"
          value={rules.explore_ratio}
          min={0}
          max={1}
          step={0.05}
          helper="Higher means more experimental drafts."
          onChange={(value) => onChange("explore_ratio", value)}
        />
        <RuleSlider
          label="Min match score"
          value={rules.min_compatibility_score}
          min={0}
          max={1}
          step={0.01}
          helper="Lower allows looser pairings between clips and hooks."
          onChange={(value) => onChange("min_compatibility_score", value)}
        />
      </div>
    </div>
  );
}
