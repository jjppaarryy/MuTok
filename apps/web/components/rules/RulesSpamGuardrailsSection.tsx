import { inputStyle, labelStyle } from "./rulesStyles";
import RuleSlider from "./RuleSlider";
import type { RulesSettings } from "../../lib/rulesConfig";

type Props = {
  rules: RulesSettings;
  onChange: (key: keyof RulesSettings, value: RulesSettings[keyof RulesSettings]) => void;
};

const numberInput = (
  label: string,
  value: number,
  onChange: (next: number) => void,
  helper?: string,
  min = 0,
  max = 999,
  step = 1
) => (
  <label style={labelStyle}>
    {label}
    {helper ? (
      <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 500, textTransform: "none" }}>
        {helper}
      </div>
    ) : null}
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
      <div style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
        These limits reduce repetition and help avoid TikTok throttling.
      </div>
      <div className="grid-3" style={{ gap: 20 }}>
        <RuleSlider
          label="Drafts on TikTok cap"
          value={guardrails.pending_drafts_cap}
          min={1}
          max={10}
          step={1}
          helper="Stops uploads if too many drafts are waiting."
          onChange={(value) => onChange("spam_guardrails", { ...guardrails, pending_drafts_cap: value })}
        />
        <RuleSlider
          label="Daily upload cap"
          value={guardrails.daily_draft_upload_cap}
          min={1}
          max={6}
          step={1}
          helper="Max drafts uploaded per day."
          onChange={(value) => onChange("spam_guardrails", { ...guardrails, daily_draft_upload_cap: value })}
        />
        <RuleSlider
          label="Min gap (hours)"
          value={guardrails.min_gap_hours}
          min={1}
          max={8}
          step={0.5}
          helper="Minimum time between posts."
          onChange={(value) => onChange("spam_guardrails", { ...guardrails, min_gap_hours: value })}
        />
        <RuleSlider
          label="Window jitter (minutes)"
          value={guardrails.window_jitter_minutes}
          min={0}
          max={120}
          step={5}
          helper="Adds randomness so posts don’t look automated."
          onChange={(value) => onChange("spam_guardrails", { ...guardrails, window_jitter_minutes: value })}
        />
        <RuleSlider
          label="Hook cooldown (days)"
          value={guardrails.recipe_cooldown_days}
          min={1}
          max={21}
          step={1}
          helper="How long before the same hook repeats."
          onChange={(value) => onChange("spam_guardrails", { ...guardrails, recipe_cooldown_days: value })}
        />
        <RuleSlider
          label="Beat 1 cooldown (days)"
          value={guardrails.beat1_exact_cooldown_days}
          min={1}
          max={30}
          step={1}
          helper="Avoids repeating the same first line."
          onChange={(value) => onChange("spam_guardrails", { ...guardrails, beat1_exact_cooldown_days: value })}
        />
        <RuleSlider
          label="Beat 2 cooldown (days)"
          value={guardrails.beat2_exact_cooldown_days}
          min={1}
          max={30}
          step={1}
          helper="Avoids repeating the second line."
          onChange={(value) => onChange("spam_guardrails", { ...guardrails, beat2_exact_cooldown_days: value })}
        />
        <RuleSlider
          label="Caption cooldown (days)"
          value={guardrails.caption_exact_cooldown_days}
          min={1}
          max={30}
          step={1}
          helper="Avoids repeating the same caption."
          onChange={(value) => onChange("spam_guardrails", { ...guardrails, caption_exact_cooldown_days: value })}
        />
        {numberInput(
          "Beat 1 prefix cooldown (days)",
          guardrails.beat1_prefix_cooldown_days,
          (value) => onChange("spam_guardrails", { ...guardrails, beat1_prefix_cooldown_days: value }),
          "Prevents starting multiple hooks with the same few words.",
          1,
          21
        )}
        {numberInput(
          "Snippet cooldown (hrs)",
          guardrails.snippet_cooldown_hours,
          (value) => onChange("spam_guardrails", { ...guardrails, snippet_cooldown_hours: value }),
          "How long before reusing the same audio snippet.",
          6,
          240,
          6
        )}
        {numberInput(
          "Track cooldown (hrs)",
          guardrails.track_cooldown_hours,
          (value) => onChange("spam_guardrails", { ...guardrails, track_cooldown_hours: value }),
          "How long before reusing the same track.",
          6,
          240,
          6
        )}
        {numberInput(
          "Clip cooldown (hrs)",
          guardrails.clip_cooldown_hours,
          (value) => onChange("spam_guardrails", { ...guardrails, clip_cooldown_hours: value }),
          "How long before reusing the same clip.",
          6,
          240,
          6
        )}
        {numberInput(
          "Montage template cooldown (hrs)",
          guardrails.montage_template_cooldown_hours,
          (value) => onChange("spam_guardrails", { ...guardrails, montage_template_cooldown_hours: value }),
          "Avoids using the same montage pattern too often.",
          6,
          240,
          6
        )}
        {numberInput(
          "Hook family/day",
          guardrails.max_hook_family_per_day,
          (value) => onChange("spam_guardrails", { ...guardrails, max_hook_family_per_day: value }),
          "Limits similar hooks on the same day.",
          1,
          6
        )}
        {numberInput(
          "Hook family/week",
          guardrails.max_hook_family_per_week,
          (value) => onChange("spam_guardrails", { ...guardrails, max_hook_family_per_week: value }),
          "Limits similar hooks over a week.",
          1,
          12
        )}
        {numberInput(
          "Anti-algo/week",
          guardrails.max_anti_algo_per_week,
          (value) => onChange("spam_guardrails", { ...guardrails, max_anti_algo_per_week: value }),
          "Caps anti-algo messaging per week.",
          0,
          7
        )}
        {numberInput(
          "Comment CTA/day",
          guardrails.max_comment_cta_per_day,
          (value) => onChange("spam_guardrails", { ...guardrails, max_comment_cta_per_day: value }),
          "Limits comment-focused hooks per day.",
          0,
          3
        )}
        {numberInput(
          "CTA streak cap",
          guardrails.max_same_cta_intent_in_row,
          (value) => onChange("spam_guardrails", { ...guardrails, max_same_cta_intent_in_row: value }),
          "Prevents back-to-back identical CTA intent.",
          1,
          6
        )}
        {numberInput(
          "Snippet style/day",
          guardrails.max_snippet_style_per_day,
          (value) => onChange("spam_guardrails", { ...guardrails, max_snippet_style_per_day: value }),
          "Limits repeating the same snippet style.",
          1,
          6
        )}
        <RuleSlider
          label="Hashtags min"
          value={guardrails.hashtag_count_min}
          min={0}
          max={10}
          step={1}
          helper="Minimum hashtags in captions."
          onChange={(value) => onChange("spam_guardrails", { ...guardrails, hashtag_count_min: value })}
        />
        <RuleSlider
          label="Hashtags max"
          value={guardrails.hashtag_count_max}
          min={1}
          max={20}
          step={1}
          helper="Maximum hashtags in captions."
          onChange={(value) => onChange("spam_guardrails", { ...guardrails, hashtag_count_max: value })}
        />
        {numberInput(
          "Retire score threshold",
          guardrails.retire_score_threshold,
          (value) => onChange("spam_guardrails", { ...guardrails, retire_score_threshold: value }),
          "Below this score, hooks are flagged for retirement.",
          0,
          1,
          0.01
        )}
        {numberInput(
          "Retire min posts",
          guardrails.retire_min_posts,
          (value) => onChange("spam_guardrails", { ...guardrails, retire_min_posts: value }),
          "Minimum posts before judging a hook.",
          1,
          20
        )}
      </div>
    </div>
  );
}
