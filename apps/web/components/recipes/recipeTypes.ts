export type Recipe = {
  id: string;
  name: string;
  enabled: boolean;
  beat1Templates: string[];
  beat2Templates: string[];
  captionTemplate?: string | null;
  ctaType: string;
  allowedSnippetTypes: string[];
  disallowedContainers: string[];
};

export type RecipeForm = {
  id: string;
  name: string;
  enabled: boolean;
  beat1Text: string;
  beat2Text: string;
  captionText: string;
  ctaType: string;
  allowedSnippetTypes: string[];
  containerAllowed: "static_daw" | "montage" | "both";
};

export const CTA_OPTIONS = ["KEEP_SKIP", "COMMENT_VIBE", "FOLLOW_FULL", "PICK_AB"];
export const SNIPPET_OPTIONS = ["moment_3_7", "moment_7_11"];

export const getContainerAllowed = (recipe: Recipe): RecipeForm["containerAllowed"] => {
  const disallowed = recipe.disallowedContainers ?? [];
  if (disallowed.includes("montage")) return "static_daw";
  if (disallowed.includes("static_daw")) return "montage";
  return "both";
};

export const toForm = (recipe: Recipe): RecipeForm => ({
  id: recipe.id,
  name: recipe.name,
  enabled: recipe.enabled,
  beat1Text: recipe.beat1Templates?.[0] ?? "",
  beat2Text: recipe.beat2Templates?.[0] ?? "",
  captionText: recipe.captionTemplate ?? "",
  ctaType: recipe.ctaType,
  allowedSnippetTypes: recipe.allowedSnippetTypes ?? [],
  containerAllowed: getContainerAllowed(recipe)
});
