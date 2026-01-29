import { prisma } from "./prisma";

export type HookTemplate = {
  onscreen: string;
  caption: string;
};

const defaultFamilies = [
  {
    name: "Early access",
    templates: [
      {
        beat1: "You’re early. Unreleased.",
        beat2: "Wait for 0:06.",
        cta: "FOLLOW_FULL",
        retention: ["Immediate promise", "Open loop", "Micro-payoff"],
        interaction: "Follow for full ID"
      }
    ]
  },
  {
    name: "Binary judgement",
    templates: [
      {
        beat1: "KEEP or SKIP?",
        beat2: "Be brutal at 0:07.",
        cta: "KEEP_SKIP",
        retention: ["Pattern interrupt", "Micro-payoff"],
        interaction: "KEEP/SKIP"
      }
    ]
  },
  {
    name: "Timestamp lure",
    templates: [
      {
        beat1: "Wait for 0:06.",
        beat2: "Did you catch it?",
        cta: "COMMENT_VIBE",
        retention: ["Open loop", "Micro-payoff", "Second beat"],
        interaction: "Did you catch it?"
      }
    ]
  },
  {
    name: "Reference anchor",
    templates: [
      {
        beat1: "If you like Anyma…",
        beat2: "This drop is the test.",
        cta: "COMMENT_VIBE",
        retention: ["Immediate promise", "Open loop"],
        interaction: "Who does this remind you of?"
      }
    ]
  },
  {
    name: "Open loop",
    templates: [
      {
        beat1: "This sound is wrong on purpose.",
        beat2: "Guess what I made it with.",
        cta: "COMMENT_VIBE",
        retention: ["Open loop", "Pattern interrupt"],
        interaction: "Guess the tool"
      }
    ]
  },
  {
    name: "Stakes",
    templates: [
      {
        beat1: "If this flops, I bin it.",
        beat2: "Should I keep it?",
        cta: "KEEP_SKIP",
        retention: ["Immediate promise", "Open loop"],
        interaction: "Keep or skip?"
      }
    ]
  },
  {
    name: "Identity gate",
    templates: [
      {
        beat1: "If you get it, you get it.",
        beat2: "Name this vibe.",
        cta: "COMMENT_VIBE",
        retention: ["Identity gate", "Open loop"],
        interaction: "Name the vibe"
      }
    ]
  },
  {
    name: "Confession",
    templates: [
      {
        beat1: "I might be overcooking this.",
        beat2: "Be honest at 0:07.",
        cta: "KEEP_SKIP",
        retention: ["Authenticity", "Second beat"],
        interaction: "Am I overcooking?"
      }
    ]
  },
  {
    name: "Micro-challenge",
    templates: [
      {
        beat1: "2 seconds. KEEP/SKIP.",
        beat2: "Don’t overthink it.",
        cta: "KEEP_SKIP",
        retention: ["Pattern interrupt", "Micro-payoff"],
        interaction: "KEEP/SKIP"
      }
    ]
  },
  {
    name: "Name it",
    templates: [
      {
        beat1: "What do we call this?",
        beat2: "Best name wins.",
        cta: "COMMENT_VIBE",
        retention: ["Open loop", "Interaction"],
        interaction: "Name the track"
      }
    ]
  }
];

export async function ensureHookFamilies() {
  const count = await prisma.hookFamily.count();
  if (count > 0) {
    return;
  }

  await prisma.hookFamily.createMany({
    data: defaultFamilies.map((family) => ({
      name: family.name,
      enabled: true,
      templates: family.templates
    }))
  });
}

export async function getEnabledHookFamilies() {
  await ensureHookFamilies();
  return prisma.hookFamily.findMany({
    where: { enabled: true }
  });
}

export async function getTopHookFamilies(limit = 2) {
  const metrics = await prisma.metric.findMany();
  const planIds = [...new Set(metrics.map((metric) => metric.postPlanId))];
  const plans = await prisma.postPlan.findMany({
    where: { id: { in: planIds } }
  });
  const planMap = new Map(plans.map((plan) => [plan.id, plan]));

  const scores = new Map<string, number>();
  for (const metric of metrics) {
    const plan = planMap.get(metric.postPlanId);
    if (!plan) continue;
    const retention = metric.views
      ? (metric.likes + metric.shares) / metric.views
      : 0;
    const interaction = metric.views ? metric.comments / metric.views : 0;
    const viralScore = retention * 0.6 + interaction * 0.4;
    scores.set(plan.hookFamily, (scores.get(plan.hookFamily) ?? 0) + viralScore);
  }

  const top = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);

  return top;
}
