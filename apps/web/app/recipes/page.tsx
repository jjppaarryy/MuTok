"use client";
import { useEffect, useMemo, useState } from "react";
import ActionButton from "../../components/ActionButton";
import PageHeader from "../../components/PageHeader";
import RecipeCard from "../../components/recipes/RecipeCard";
import RecipesBulkTools from "../../components/recipes/RecipesBulkTools";
import RecipesFilters from "../../components/recipes/RecipesFilters";
import { Recipe, RecipeForm, toForm } from "../../components/recipes/recipeTypes";
type RecipeScore = {
  recipeId: string;
  recipeName: string;
  score7d: number;
  count7d: number;
  score14d: number;
  count14d: number;
};
type Coverage = {
  activeRecipes: number;
  requiredRecipes: number;
  shortfall: number;
  cadencePerDay: number;
  cooldownDays: number;
};
const uniqueRecipeName = (base: string) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base} ${stamp}-${rand}`;
};
export default function RecipesPage() {
  const [recipes, setRecipes] = useState<RecipeForm[]>([]);
  const [recipeScores, setRecipeScores] = useState<RecipeScore[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [retireCandidates, setRetireCandidates] = useState<RecipeScore[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived">("active");
  const [filterCta, setFilterCta] = useState("all");
  const [filterContainer, setFilterContainer] = useState("all");
  const [search, setSearch] = useState("");
  const [importText, setImportText] = useState("");
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const loadRecipes = async () => {
    const response = await fetch("/api/recipes", { cache: "no-store" });
    const data = (await response.json()) as { recipes: Recipe[] };
    setRecipes((data.recipes ?? []).map(toForm));
  };
  const loadSummary = async () => {
    try {
      const response = await fetch("/api/analytics/summary");
      if (!response.ok) {
        setCoverage(null);
        setRecipeScores([]);
        setRetireCandidates([]);
        return;
      }
      const text = await response.text();
      if (!text) {
        setCoverage(null);
        setRecipeScores([]);
        setRetireCandidates([]);
        return;
      }
      const data = JSON.parse(text) as {
        coverage?: Coverage;
        recipeScores?: RecipeScore[];
        notifications?: { retireCandidates?: RecipeScore[] };
      };
      setCoverage(data.coverage ?? null);
      setRecipeScores(data.recipeScores ?? []);
      setRetireCandidates(data.notifications?.retireCandidates ?? []);
    } catch {
      setCoverage(null);
      setRecipeScores([]);
      setRetireCandidates([]);
    }
  };
  useEffect(() => {
    void loadRecipes();
    void loadSummary();
  }, []);
  const scoreMap = useMemo(() => new Map(recipeScores.map((score) => [score.recipeId, score])), [recipeScores]);
  const retireSet = useMemo(() => new Set(retireCandidates.map((recipe) => recipe.recipeId)), [retireCandidates]);
  const filtered = useMemo(() => {
    return recipes.filter((recipe) => {
      if (filterStatus === "active" && !recipe.enabled) return false;
      if (filterStatus === "archived" && recipe.enabled) return false;
      if (filterCta !== "all" && recipe.ctaType !== filterCta) return false;
      if (filterContainer !== "all" && recipe.containerAllowed !== filterContainer) {
        return false;
      }
      if (search && !recipe.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [recipes, filterStatus, filterCta, filterContainer, search]);
  const updateRecipe = (id: string, updates: Partial<RecipeForm>) => {
    setRecipes((prev) => prev.map((recipe) => (recipe.id === id ? { ...recipe, ...updates } : recipe)));
  };
  const saveRecipe = async (recipe: RecipeForm) => {
    setMessage(null);
    const payload = {
      name: recipe.name,
      beat1Text: recipe.beat1Text,
      beat2Text: recipe.beat2Text,
      captionText: recipe.captionText,
      ctaType: recipe.ctaType,
      allowedSnippetTypes: recipe.allowedSnippetTypes ?? [],
      containerAllowed: recipe.containerAllowed,
      enabled: recipe.enabled
    };
    const response = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    if (!response.ok) {
      const err = await response.text();
      setMessage(`Failed to save hook: ${response.status} ${err || response.statusText}`);
      return;
    }
    setMessage("Hook saved.");
    await loadRecipes();
    await loadSummary();
  };
  const createRecipe = async () => {
    setMessage(null);
    const name = uniqueRecipeName("New hook");
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        beat1Text: "Beat 1...",
        beat2Text: "Beat 2...",
        captionText: "Caption...",
        ctaType: "KEEP_SKIP",
        containerAllowed: "both",
        allowedSnippetTypes: []
      })
    });
    if (!response.ok) {
      setMessage("Failed to create hook.");
      return;
    }
    await loadRecipes();
    await loadSummary();
    setMessage("Hook created.");
  };
  const duplicateRecipe = async (recipe: RecipeForm) => {
    setMessage(null);
    const name = uniqueRecipeName(`${recipe.name} Copy`);
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        beat1Text: recipe.beat1Text,
        beat2Text: recipe.beat2Text,
        captionText: recipe.captionText,
        ctaType: recipe.ctaType,
        containerAllowed: recipe.containerAllowed,
        allowedSnippetTypes: recipe.allowedSnippetTypes
      })
    });
    if (!response.ok) {
      setMessage("Failed to duplicate hook.");
      return;
    }
    await loadRecipes();
    await loadSummary();
    setMessage("Hook duplicated.");
  };
  const toggleArchive = async (recipe: RecipeForm) => {
    await saveRecipe({ ...recipe, enabled: !recipe.enabled });
  };
  const exportJson = () => {
    const payload = JSON.stringify(recipes, null, 2);
    setImportText(payload);
    setBulkMessage("Exported to the box below.");
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(payload).then(
        () => setBulkMessage("Exported and copied to clipboard."),
        () => setBulkMessage("Exported to the box below.")
      );
    }
  };
  const importJson = async () => {
    setMessage(null);
    setBulkMessage(null);
    try {
      if (!importText.trim()) {
        setBulkMessage("Paste JSON first, then import.");
        return;
      }
      const parsed = JSON.parse(importText) as RecipeForm[];
      if (!Array.isArray(parsed)) {
        setBulkMessage("JSON must be an array of hooks.");
        return;
      }
      const payload = parsed.map((recipe) => ({
        name: recipe.name,
        beat1Text: recipe.beat1Text,
        beat2Text: recipe.beat2Text,
        captionText: recipe.captionText,
        ctaType: recipe.ctaType,
        containerAllowed: recipe.containerAllowed,
        allowedSnippetTypes: recipe.allowedSnippetTypes,
        enabled: recipe.enabled
      }));
      if (payload.length === 0) {
        setBulkMessage("No hooks found to import.");
        return;
      }
      const response = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipes: payload })
      });
      if (!response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text) as { error?: string };
          setBulkMessage(`Import failed: ${data.error ?? "Unknown error"}`);
        } catch {
          setBulkMessage(text ? `Import failed: ${text}` : "Import failed.");
        }
        return;
      }
      const data = (await response.json()) as { created?: string[]; skipped?: string[] };
      const createdCount = data.created?.length ?? 0;
      const skippedCount = data.skipped?.length ?? Math.max(0, payload.length - createdCount);
      setBulkMessage(`Imported ${createdCount} hook${createdCount === 1 ? "" : "s"}. Skipped ${skippedCount}.`);
      await loadRecipes();
      await loadSummary();
    } catch {
      setBulkMessage("Invalid JSON.");
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      <PageHeader
        title="Hooks"
        description="Your pre-approved hook library. These lines go straight into posts."
        tip="Edit a hook here if you want to change the wording."
        actions={
          <div className="wrap-actions">
            <ActionButton label="New hook" onClick={createRecipe} />
          </div>
        }
      />
      {message ? (
        <div style={{ padding: 16, borderRadius: 12, backgroundColor: "#f0fdf4", color: "#166534" }}>
          {message}
        </div>
      ) : null}
      {coverage && coverage.shortfall > 0 ? (
        <div style={{ padding: 16, borderRadius: 12, backgroundColor: "#fff7ed", color: "#9a3412" }}>
          You need {coverage.shortfall} more active hooks to sustain {coverage.cadencePerDay}/day with a {coverage.cooldownDays}-day cooldown.
        </div>
      ) : null}
      {retireCandidates.length > 0 ? (
        <div style={{ padding: 16, borderRadius: 12, backgroundColor: "#fef2f2", color: "#b91c1c" }}>
          {retireCandidates.length} hooks are underperforming and ready to retire.
        </div>
      ) : null}
      <RecipesFilters
        filterStatus={filterStatus}
        filterCta={filterCta}
        filterContainer={filterContainer}
        search={search}
        onStatusChange={setFilterStatus}
        onCtaChange={setFilterCta}
        onContainerChange={setFilterContainer}
        onSearchChange={setSearch}
      />
      <div style={{ display: "grid", gap: 24 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "white", color: "#64748b" }}>
            No hooks match these filters yet. Try clearing filters or create a new hook.
          </div>
        ) : (
          filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              stats={scoreMap.get(recipe.id)}
              isRetireCandidate={retireSet.has(recipe.id)}
              onChange={updateRecipe}
              onSave={saveRecipe}
              onDuplicate={duplicateRecipe}
              onToggleArchive={toggleArchive}
            />
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-end" }}>
        <ActionButton label="Export JSON" variant="secondary" onClick={exportJson} />
        <ActionButton label="Import JSON" variant="secondary" onClick={importJson} />
      </div>
      <RecipesBulkTools importText={importText} onImportTextChange={setImportText} message={bulkMessage} />
    </div>
  );
}
