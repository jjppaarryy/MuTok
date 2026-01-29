import { DateTime } from "luxon";
import { prisma } from "./prisma";

type Snippet = Awaited<ReturnType<typeof prisma.snippet.findMany>>[number];

export const pickFixedBeat = (templates: unknown): string => {
  if (!Array.isArray(templates)) return "";
  const first = templates[0];
  return typeof first === "string" ? first.trim() : "";
};

export const isCommentCta = (ctaType: string) => {
  return ctaType.toUpperCase().includes("COMMENT");
};

export const pickContainerForSlot = (counts: { static_daw: number; montage: number }) => {
  const order: Array<"static_daw" | "montage"> = ["static_daw", "static_daw", "montage"];
  const index = (counts.static_daw + counts.montage) % order.length;
  return order[index];
};

export const updateContainerCounts = (
  counts: { static_daw: number; montage: number },
  container: string
) => {
  if (container === "montage") {
    return { ...counts, montage: counts.montage + 1 };
  }
  return { ...counts, static_daw: counts.static_daw + 1 };
};

export const getSnippetStrategy = (snippet: Snippet) => {
  if (snippet.moment3to7) return "moment_3_7";
  if (snippet.moment7to11) return "moment_7_11";
  return "any";
};

export const getSnippetStyle = (snippet: Snippet) => {
  if (snippet.section) return snippet.section.toLowerCase();
  return getSnippetStrategy(snippet);
};

export const getTodayContainerCounts = async () => {
  const start = DateTime.local().startOf("day").toJSDate();
  const end = DateTime.local().endOf("day").toJSDate();
  const plans = await prisma.postPlan.findMany({
    where: {
      scheduledFor: { gte: start, lte: end },
      status: { not: "FAILED" }
    },
    select: { container: true }
  });
  const counts = { static_daw: 0, montage: 0 };
  for (const plan of plans) {
    if (plan.container === "montage") {
      counts.montage += 1;
    } else {
      counts.static_daw += 1;
    }
  }
  return counts;
};
