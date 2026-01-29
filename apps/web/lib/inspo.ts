type InspoVariantInput = {
  beat1?: string;
  beat2?: string;
  caption?: string;
  notes?: string;
};

type InspoPatternInput = {
  core_mechanic?: string;
  hook_family?: string;
  cta_intents_allowed?: string[];
  music_first_variants?: InspoVariantInput[];
};

export type InspoInput = {
  source?: string;
  source_id?: string;
  sourceId?: string;
  notion_row_id?: string;
  title?: string;
  copy?: string;
  copy_template?: string;
  content_type?: string;
  contentType?: string;
  asset_type?: string;
  assetType?: string;
  link_original?: string;
  linkOriginal?: string;
  copy_rewrite_universal?: string;
  copyRewrite?: string;
  why_it_works?: string;
  whyItWorks?: string;
  description?: string;
  how_to_use?: string;
  howToUse?: string;
  theme_tags?: string[];
  themeTags?: string[];
  theme?: string;
  purpose_tags?: string[];
  purposeTags?: string[];
  purpose?: string;
  genre_tags?: string[];
  genreTags?: string[];
  genre?: string;
  hashtags?: string[];
  stats?: Record<string, number | null>;
  metrics_views?: number;
  metrics_likes?: number;
  metrics_comments?: number;
  metrics_shares?: number;
  created_time?: string;
  createdTime?: string;
  seed_patterns?: InspoPatternInput[];
  seedPatterns?: InspoPatternInput[];
  is_active?: boolean;
};

type NormalizedVariant = {
  beat1: string;
  beat2: string;
  caption?: string;
  notes?: string;
};

type NormalizedPattern = {
  core_mechanic?: string;
  hook_family?: string;
  cta_intents_allowed?: string[];
  music_first_variants: NormalizedVariant[];
};

const genderedReplacements: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bhe\b/gi, replacement: "they" },
  { pattern: /\bshe\b/gi, replacement: "they" },
  { pattern: /\bhim\b/gi, replacement: "them" },
  { pattern: /\bher\b/gi, replacement: "them" },
  { pattern: /\bhis\b/gi, replacement: "their" },
  { pattern: /\bhers\b/gi, replacement: "theirs" },
  { pattern: /\bguys\b/gi, replacement: "folks" },
  { pattern: /\bgirls\b/gi, replacement: "people" },
  { pattern: /\bboys\b/gi, replacement: "people" },
  { pattern: /\bmen\b/gi, replacement: "people" },
  { pattern: /\bwomen\b/gi, replacement: "people" },
  { pattern: /\bfemale\b/gi, replacement: "person" },
  { pattern: /\bmale\b/gi, replacement: "person" },
  { pattern: /\bladies\b/gi, replacement: "people" },
  { pattern: /\blady\b/gi, replacement: "person" },
  { pattern: /\bman\b/gi, replacement: "person" },
  { pattern: /\bboy\b/gi, replacement: "person" },
  { pattern: /\bgirl\b/gi, replacement: "person" }
];

export const removeGenderedLanguage = (text?: string | null) => {
  if (!text) return text ?? null;
  return genderedReplacements.reduce(
    (value, rule) => value.replace(rule.pattern, rule.replacement),
    text
  );
};

const clampLine = (value: string) => normalizeLine(value);

const normalizeLine = (value: string) => value.replace(/\s+/g, " ").trim();

const firstSentence = (text: string) => {
  const match = text.split(/[.!?]/).map((part) => part.trim()).filter(Boolean);
  return match[0] ?? text;
};

const sanitizeVariant = (variant: InspoVariantInput): NormalizedVariant | null => {
  const beat1Raw = removeGenderedLanguage(variant.beat1 ?? "") ?? "";
  const beat2Raw = removeGenderedLanguage(variant.beat2 ?? "") ?? "";
  const beat1 = clampLine(beat1Raw.replace(/\n+/g, " "));
  const beat2 = clampLine(beat2Raw.replace(/\n+/g, " "));
  if (!beat1 || !beat2) return null;
  const caption = removeGenderedLanguage(variant.caption ?? "") ?? undefined;
  const notes = removeGenderedLanguage(variant.notes ?? "") ?? undefined;
  return { beat1, beat2, caption, notes };
};

const normalizeTags = (tags?: string[] | null) =>
  Array.isArray(tags) ? tags.map((tag) => tag.trim()).filter(Boolean) : [];

export const buildSeedPatternsFromCopy = (input: InspoInput): NormalizedPattern[] => {
  const baseCopy =
    input.copy_template ?? input.copy ?? input.copyRewrite ?? input.copy_rewrite_universal ?? "";
  const cleanedCopy = removeGenderedLanguage(baseCopy) ?? "";
  const safeCopy = cleanedCopy.replace(/\{[^}]+\}/g, "").replace(/\s+/g, " ").trim();
  const title = removeGenderedLanguage(input.title ?? "") ?? "";

  if (!safeCopy && !title) return [];

  const purpose = (input.purpose ?? input.purposeTags?.[0] ?? "").toLowerCase();
  const theme = (input.theme ?? input.themeTags?.[0] ?? "").toLowerCase();
  const context = `${title} ${safeCopy} ${input.how_to_use ?? ""}`.toLowerCase();

  const sentences = safeCopy
    .split(/[.!?]/)
    .map((part) => normalizeLine(part))
    .filter((value) => value.length >= 8);
  const derivedBeat2 = sentences[1] ?? "";

  const beat2Options = new Set<string>();
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
    sentences[0] ?? "",
    isLabelTitle ? "" : title
  ]
    .map((value) => normalizeLine(value))
    .filter((value) => value.length >= 8);

  const dedupedBeat1 = Array.from(new Set(beat1Candidates.map((line) => line.toLowerCase())))
    .map((key) => beat1Candidates.find((line) => line.toLowerCase() === key))
    .filter((line): line is string => Boolean(line));

  const variants: NormalizedVariant[] = [];
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
      core_mechanic: input.title ?? input.purpose ?? "inspo_seed",
      hook_family: "inspo_seed",
      cta_intents_allowed: ["binary_vote", "comment_identity", "dj_context"],
      music_first_variants: variants
    }
  ];
};

export const normalizeSeedPatterns = (input: InspoInput): NormalizedPattern[] => {
  const raw = input.seed_patterns ?? input.seedPatterns ?? [];
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((pattern) => ({
      core_mechanic: pattern.core_mechanic,
      hook_family: pattern.hook_family,
      cta_intents_allowed: Array.isArray(pattern.cta_intents_allowed)
        ? pattern.cta_intents_allowed
        : [],
      music_first_variants: Array.isArray(pattern.music_first_variants)
        ? pattern.music_first_variants
            .map((variant) => sanitizeVariant(variant))
            .filter((variant): variant is NormalizedVariant => Boolean(variant))
        : []
    }));
  }

  return buildSeedPatternsFromCopy(input);
};

const mergeTags = (...values: Array<string[] | string | undefined>) => {
  const items: string[] = [];
  values.forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => items.push(entry));
    } else if (typeof value === "string") {
      items.push(value);
    }
  });
  return normalizeTags(items);
};

const buildStats = (input: InspoInput) => {
  if (input.stats) return input.stats;
  const hasMetrics =
    typeof input.metrics_views === "number" ||
    typeof input.metrics_likes === "number" ||
    typeof input.metrics_comments === "number" ||
    typeof input.metrics_shares === "number";
  if (!hasMetrics) return null;
  return {
    views: input.metrics_views ?? null,
    likes: input.metrics_likes ?? null,
    comments: input.metrics_comments ?? null,
    shares: input.metrics_shares ?? null
  };
};

export const normalizeInspoItem = (input: InspoInput) => {
  const source =
    input.source ??
    (input.notion_row_id || input.title ? "notion_inspo" : "");
  const sourceId = input.source_id ?? input.sourceId ?? input.notion_row_id ?? null;
  const copyRewrite = input.copy_rewrite_universal ?? input.copyRewrite ?? input.copy ?? null;
  return {
    source,
    sourceId,
    title: input.title ?? null,
    contentType: input.content_type ?? input.contentType ?? null,
    assetType: input.asset_type ?? input.assetType ?? null,
    linkOriginal: input.link_original ?? input.linkOriginal ?? null,
    copyRewrite: removeGenderedLanguage(copyRewrite),
    whyItWorks: removeGenderedLanguage(input.why_it_works ?? input.whyItWorks ?? null),
    description: removeGenderedLanguage(input.description ?? null),
    howToUse: removeGenderedLanguage(input.how_to_use ?? input.howToUse ?? null),
    themeTags: mergeTags(input.theme_tags, input.themeTags, input.theme),
    purposeTags: mergeTags(input.purpose_tags, input.purposeTags, input.purpose),
    genreTags: mergeTags(input.genre_tags, input.genreTags, input.genre),
    hashtags: normalizeTags(input.hashtags),
    stats: buildStats(input),
    createdTime: input.created_time ?? input.createdTime ?? null,
    seedPatterns: normalizeSeedPatterns(input)
  };
};

export const parseInspoPayload = (payload: unknown): InspoInput[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as InspoInput[];
  if (typeof payload !== "object") return [];
  const data = payload as { inspo_items?: unknown; inspo_item?: unknown };
  if (Array.isArray(data.inspo_items)) return data.inspo_items as InspoInput[];
  return [payload as InspoInput];
};
