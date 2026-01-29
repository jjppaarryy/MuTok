import type { RulesSettings } from "./rulesConfig";
import type { getRecoveryStatus } from "./recoveryMode";

type RecoveryStatus = Awaited<ReturnType<typeof getRecoveryStatus>>;

export const applyRecoveryRules = (rules: RulesSettings, recovery: RecoveryStatus) => {
  if (!recovery.active) return rules;
  const recoveryMode = rules.recovery_mode;
  const allowedContainers = recoveryMode.allow_montage
    ? rules.allowed_containers
    : rules.allowed_containers.filter((container) => container !== "montage");
  return {
    ...rules,
    cadence_per_day: recoveryMode.cadence_per_day,
    allowed_containers: allowedContainers.length ? allowedContainers : ["static_daw"],
    spam_guardrails: {
      ...rules.spam_guardrails,
      max_comment_cta_per_day: recoveryMode.allow_comment_cta
        ? rules.spam_guardrails.max_comment_cta_per_day
        : 0,
      hashtag_count_max: recoveryMode.hashtag_max
    },
    viral_engine: {
      ...rules.viral_engine,
      allowed_cta_types: recoveryMode.allow_comment_cta
        ? rules.viral_engine.allowed_cta_types
        : rules.viral_engine.allowed_cta_types.filter((cta) => !cta.includes("COMMENT"))
    }
  };
};
