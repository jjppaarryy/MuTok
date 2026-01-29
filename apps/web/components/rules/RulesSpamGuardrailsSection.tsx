import { inputStyle, labelStyle } from "./rulesStyles";
import type { RulesSettings } from "../../lib/rulesConfig";

type Props = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

const numberInput = (
  label: string,
  value: number,
  onChange: (next: number) => void,
  min = 0,
  max = 999,
  step = 1
) => (
  <label style={labelStyle}>
    {label}
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      style={inputStyle}
    />
  </label>
);

export default function RulesSpamGuardrailsSection({ rules, onChange }: Props) {
  const guardrails = rules.spam_guardrails;
  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
        Spam & Account Health Guardrails
      </h3>
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {numberInput("Pending drafts cap", guardrails.pending_drafts_cap, (value) =>
          onChange("spam_guardrails", { ...guardrails, pending_drafts_cap: value })
        )}
        {numberInput("Daily upload cap", guardrails.daily_draft_upload_cap, (value) =>
          onChange("spam_guardrails", { ...guardrails, daily_draft_upload_cap: value })
        )}
        {numberInput("Min gap hours", guardrails.min_gap_hours, (value) =>
          onChange("spam_guardrails", { ...guardrails, min_gap_hours: value })
        , 1, 24, 0.5)}
        {numberInput("Window jitter (min)", guardrails.window_jitter_minutes, (value) =>
          onChange("spam_guardrails", { ...guardrails, window_jitter_minutes: value })
        , 0, 120)}
        {numberInput("Recipe cooldown (days)", guardrails.recipe_cooldown_days, (value) =>
          onChange("spam_guardrails", { ...guardrails, recipe_cooldown_days: value })
        )}
        {numberInput("Beat1 cooldown (days)", guardrails.beat1_exact_cooldown_days, (value) =>
          onChange("spam_guardrails", { ...guardrails, beat1_exact_cooldown_days: value })
        )}
        {numberInput("Beat2 cooldown (days)", guardrails.beat2_exact_cooldown_days, (value) =>
          onChange("spam_guardrails", { ...guardrails, beat2_exact_cooldown_days: value })
        )}
        {numberInput("Caption cooldown (days)", guardrails.caption_exact_cooldown_days, (value) =>
          onChange("spam_guardrails", { ...guardrails, caption_exact_cooldown_days: value })
        )}
        {numberInput("Beat1 prefix cooldown (days)", guardrails.beat1_prefix_cooldown_days, (value) =>
          onChange("spam_guardrails", { ...guardrails, beat1_prefix_cooldown_days: value })
        )}
        {numberInput("Snippet cooldown (hrs)", guardrails.snippet_cooldown_hours, (value) =>
          onChange("spam_guardrails", { ...guardrails, snippet_cooldown_hours: value })
        )}
        {numberInput("Track cooldown (hrs)", guardrails.track_cooldown_hours, (value) =>
          onChange("spam_guardrails", { ...guardrails, track_cooldown_hours: value })
        )}
        {numberInput("Clip cooldown (hrs)", guardrails.clip_cooldown_hours, (value) =>
          onChange("spam_guardrails", { ...guardrails, clip_cooldown_hours: value })
        )}
        {numberInput("Montage template cooldown (hrs)", guardrails.montage_template_cooldown_hours, (value) =>
          onChange("spam_guardrails", { ...guardrails, montage_template_cooldown_hours: value })
        )}
        {numberInput("Hook family/day", guardrails.max_hook_family_per_day, (value) =>
          onChange("spam_guardrails", { ...guardrails, max_hook_family_per_day: value })
        )}
        {numberInput("Hook family/week", guardrails.max_hook_family_per_week, (value) =>
          onChange("spam_guardrails", { ...guardrails, max_hook_family_per_week: value })
        )}
        {numberInput("Anti-algo/week", guardrails.max_anti_algo_per_week, (value) =>
          onChange("spam_guardrails", { ...guardrails, max_anti_algo_per_week: value })
        )}
        {numberInput("Comment CTA/day", guardrails.max_comment_cta_per_day, (value) =>
          onChange("spam_guardrails", { ...guardrails, max_comment_cta_per_day: value })
        )}
        {numberInput("CTA streak cap", guardrails.max_same_cta_intent_in_row, (value) =>
          onChange("spam_guardrails", { ...guardrails, max_same_cta_intent_in_row: value })
        )}
        {numberInput("Snippet style/day", guardrails.max_snippet_style_per_day, (value) =>
          onChange("spam_guardrails", { ...guardrails, max_snippet_style_per_day: value })
        )}
        {numberInput("Hashtags min", guardrails.hashtag_count_min, (value) =>
          onChange("spam_guardrails", { ...guardrails, hashtag_count_min: value })
        , 0, 10)}
        {numberInput("Hashtags max", guardrails.hashtag_count_max, (value) =>
          onChange("spam_guardrails", { ...guardrails, hashtag_count_max: value })
        , 1, 20)}
        {numberInput("Retire score threshold", guardrails.retire_score_threshold, (value) =>
          onChange("spam_guardrails", { ...guardrails, retire_score_threshold: value })
        , 0, 1, 0.01)}
        {numberInput("Retire min posts", guardrails.retire_min_posts, (value) =>
          onChange("spam_guardrails", { ...guardrails, retire_min_posts: value })
        , 1, 20)}
      </div>
    </div>
  );
}
