import { prisma } from "./prisma";
import { jasproSystemPrompt } from "./brainPrompt";
import { defaultRules, type RulesSettings } from "./rulesConfig";

export type BrainSettings = {
  system_prompt: string;
};

export const defaultBrainSettings: BrainSettings = {
  system_prompt: jasproSystemPrompt
};

export async function getRulesSettings(): Promise<RulesSettings> {
  const stored = await prisma.setting.findUnique({
    where: { key: "rules" }
  });

  if (!stored) {
    return defaultRules;
  }

  const value = stored.valueJson as Partial<RulesSettings>;
  return {
    ...defaultRules,
    ...value,
    montage: {
      ...defaultRules.montage,
      ...(value.montage ?? {})
    },
    text_overlay: {
      ...defaultRules.text_overlay,
      ...(value.text_overlay ?? {})
    },
    guardrails: {
      ...defaultRules.guardrails,
      ...(value.guardrails ?? {})
    },
    spam_guardrails: {
      ...defaultRules.spam_guardrails,
      ...(value.spam_guardrails ?? {})
    },
    recovery_mode: {
      ...defaultRules.recovery_mode,
      ...(value.recovery_mode ?? {})
    },
    viral_engine: {
      ...defaultRules.viral_engine,
      ...(value.viral_engine ?? {})
    },
    optimiser_policy: {
      ...defaultRules.optimiser_policy,
      ...(value.optimiser_policy ?? {}),
      test_dimensions: {
        ...defaultRules.optimiser_policy.test_dimensions,
        ...(value.optimiser_policy?.test_dimensions ?? {})
      },
      promotion: {
        ...defaultRules.optimiser_policy.promotion,
        ...(value.optimiser_policy?.promotion ?? {})
      },
      retirement: {
        ...defaultRules.optimiser_policy.retirement,
        ...(value.optimiser_policy?.retirement ?? {})
      }
    }
  };
}
