import { useState } from "react";
import ActionButton from "../ActionButton";

type Suggestion = {
  name: string;
  beat1Text: string;
  beat2Text: string;
  captionText: string;
  ctaType: string;
  containerAllowed: "static_daw" | "montage" | "both";
  allowedSnippetTypes: string[];
};

const cardStyle: React.CSSProperties = {
  padding: 48,
  borderRadius: 24,
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  display: "flex",
  flexDirection: "column",
  gap: 24
};

export default function RecipeSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setMessage(null);
    setLoading(true);
    const response = await fetch("/api/analysis/propose", { method: "POST" });
    const data = (await response.json()) as { suggestions?: Suggestion[]; error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Failed to load suggestions.");
      setLoading(false);
      return;
    }
    setSuggestions(data.suggestions ?? []);
    setLoading(false);
  };

  const addSuggestion = async (suggestion: Suggestion) => {
    setMessage(null);
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...suggestion, enabled: false })
    });
    if (!response.ok) {
      setMessage("Failed to add suggestion.");
      return;
    }
    setMessage("Added suggestion as draft (archived).");
  };

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>Hook Suggestions</h2>
          <div style={{ color: "#64748b", marginTop: 8 }}>
            Ask GPT to propose new hooks based on winners. You approve by adding as drafts.
          </div>
        </div>
        <ActionButton label={loading ? "Loading..." : "Generate ideas"} onClick={fetchSuggestions} disabled={loading} />
      </div>

      {message ? (
        <div style={{ padding: 16, borderRadius: 12, backgroundColor: "#f0fdf4", color: "#166534" }}>
          {message}
        </div>
      ) : null}

      {suggestions.length === 0 ? (
        <div style={{ color: "#94a3b8" }}>No suggestions yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {suggestions.map((suggestion, index) => (
            <div key={`${suggestion.name}-${index}`} style={{ border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
              <div style={{ fontWeight: 700 }}>{suggestion.name}</div>
              <div style={{ marginTop: 8, whiteSpace: "pre-line" }}>
                {suggestion.beat1Text}
                {"\n"}
                {suggestion.beat2Text}
              </div>
              <div style={{ marginTop: 8, color: "#475569" }}>{suggestion.captionText}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>CTA: {suggestion.ctaType}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>Container: {suggestion.containerAllowed}</span>
                <ActionButton label="Add as draft" variant="secondary" onClick={() => addSuggestion(suggestion)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
