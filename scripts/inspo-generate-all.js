const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const normalizeLine = (value) => String(value || "").replace(/\s+/g, " ").trim();

const firstSentence = (text) => {
  const match = String(text || "")
    .split(/[.!?]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return match[0] || text;
};

const removeGenderedLanguage = (text) => {
  if (!text) return text;
  return text
    .replace(/\bhe\b/gi, "they")
    .replace(/\bshe\b/gi, "they")
    .replace(/\bhim\b/gi, "them")
    .replace(/\bher\b/gi, "them")
    .replace(/\bhis\b/gi, "their")
    .replace(/\bhers\b/gi, "theirs")
    .replace(/\bguys\b/gi, "folks")
    .replace(/\bgirls\b/gi, "people")
    .replace(/\bboys\b/gi, "people")
    .replace(/\bmen\b/gi, "people")
    .replace(/\bwomen\b/gi, "people")
    .replace(/\bfemale\b/gi, "person")
    .replace(/\bmale\b/gi, "person")
    .replace(/\bladies\b/gi, "people")
    .replace(/\blady\b/gi, "person")
    .replace(/\bman\b/gi, "person")
    .replace(/\bboy\b/gi, "person")
    .replace(/\bgirl\b/gi, "person");
};

const buildSeedPatternsFromCopy = (item) => {
  const baseCopy = item.copy || "";
  const cleanedCopy = removeGenderedLanguage(baseCopy) || "";
  const safeCopy = cleanedCopy.replace(/\{[^}]+\}/g, "").replace(/\s+/g, " ").trim();
  const title = removeGenderedLanguage(item.title || "") || "";

  if (!safeCopy && !title) return [];

  const purpose = String(item.purpose || "").toLowerCase();
  const theme = String(item.theme || "").toLowerCase();
  const context = `${title} ${safeCopy} ${item.how_to_use || ""}`.toLowerCase();

  const sentences = safeCopy
    .split(/[.!?]/)
    .map((part) => normalizeLine(part))
    .filter((value) => value.length >= 8);
  const derivedBeat2 = sentences[1] || "";

  const beat2Options = new Set();
  if (derivedBeat2) {
    beat2Options.add(derivedBeat2);
  } else {
    let hasSpecificCta = false;
    if (context.includes("keep or skip") || context.includes("skip")) {
      beat2Options.add("KEEP or SKIP?");
    }
    if (context.includes("drop") || context.includes("dj") || context.includes("set")) {
      beat2Options.add("Warm-up or peak-time?");
      hasSpecificCta = true;
    }
    if (context.includes("where are you listening")) {
      beat2Options.add("Comment where you're listening from.");
      hasSpecificCta = true;
    }
    if (context.includes("sub-genre") || context.includes("genre")) {
      beat2Options.add("Comment the genre.");
      hasSpecificCta = true;
    }
    if (
      context.includes("comment") ||
      purpose.includes("fan") ||
      purpose.includes("behind") ||
      theme.includes("direct") ||
      theme.includes("creative")
    ) {
      if (!hasSpecificCta) beat2Options.add("Comment the vibe.");
    }
    if (beat2Options.size === 0) beat2Options.add("KEEP or SKIP?");
  }
  const isLabelTitle = title.includes(":");
  const beat1Candidates = [
    sentences[0] || "",
    isLabelTitle ? "" : title
  ]
    .map((value) => normalizeLine(value))
    .filter((value) => value.length >= 8);

  const dedupedBeat1 = Array.from(new Set(beat1Candidates.map((line) => line.toLowerCase())))
    .map((key) => beat1Candidates.find((line) => line.toLowerCase() === key))
    .filter(Boolean);

  const variants = [];
  for (const beat1 of dedupedBeat1) {
    for (const beat2 of beat2Options) {
      variants.push({
        beat1,
        beat2,
        caption: cleanedCopy || undefined,
        notes: "Auto-derived from inspo copy."
      });
      if (variants.length >= 4) break;
    }
    if (variants.length >= 4) break;
  }

  return [
    {
      core_mechanic: item.title || item.purpose || "inspo_seed",
      hook_family: "inspo_seed",
      cta_intents_allowed: ["binary_vote", "comment_identity", "dj_context"],
      music_first_variants: variants
    }
  ];
};

async function run() {
  const items = await prisma.inspoItem.findMany();
  let updated = 0;

  for (const item of items) {
    const generated = buildSeedPatternsFromCopy({
      title: item.title ?? undefined,
      copy: item.copyRewrite ?? undefined,
      purposeTags: Array.isArray(item.purposeTags) ? item.purposeTags : undefined,
      themeTags: Array.isArray(item.themeTags) ? item.themeTags : undefined,
      purpose: Array.isArray(item.purposeTags) ? item.purposeTags?.[0] : undefined,
      theme: Array.isArray(item.themeTags) ? item.themeTags?.[0] : undefined,
      how_to_use: item.howToUse ?? undefined
    });

    await prisma.inspoItem.update({
      where: { id: item.id },
      data: {
        seedPatterns: generated.length ? generated : null
      }
    });
    updated += 1;
  }

  console.log(`Generated seed patterns for ${updated} inspo items.`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
