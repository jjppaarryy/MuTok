import type { RulesSettings } from "../../lib/rulesConfig";
import RulesBasicsSection from "./RulesBasicsSection";
import RulesMontageSection from "./RulesMontageSection";
import RulesScheduleSection from "./RulesScheduleSection";
import RulesHashtagsSection from "./RulesHashtagsSection";
import RulesTextOverlaySection from "./RulesTextOverlaySection";
import RulesTextGuardrailsSection from "./RulesTextGuardrailsSection";
import RulesSpamGuardrailsSection from "./RulesSpamGuardrailsSection";
import RulesRecoverySection from "./RulesRecoverySection";

type RulesFormProps = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

export default function RulesForm({ rules, onChange }: RulesFormProps) {
  return (
    <div
      style={{ padding: 48, borderRadius: 24, display: "flex", flexDirection: "column", gap: 32 }}
      className="panel"
    >
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>Rules Configuration</h2>

      <RulesBasicsSection rules={rules} onChange={onChange} />
      <RulesMontageSection rules={rules} onChange={onChange} />
      <RulesScheduleSection rules={rules} onChange={onChange} />
      <RulesHashtagsSection rules={rules} onChange={onChange} />
      <RulesTextOverlaySection rules={rules} onChange={onChange} />
      <RulesTextGuardrailsSection rules={rules} onChange={onChange} />
      <RulesSpamGuardrailsSection rules={rules} onChange={onChange} />
      <RulesRecoverySection rules={rules} onChange={onChange} />
    </div>
  );
}
