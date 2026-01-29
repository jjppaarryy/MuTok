"use client";

import { useState } from "react";
import ActionButton from "../ActionButton";

type InspoImportModalProps = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 40
};

const modalStyle: React.CSSProperties = {
  width: "min(720px, 94vw)",
  background: "white",
  borderRadius: 24,
  padding: 32,
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)",
  display: "grid",
  gap: 16
};

const textareaStyle: React.CSSProperties = {
  minHeight: 220,
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: 16,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none"
};

export default function InspoImportModal({ open, onClose, onImported }: InspoImportModalProps) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleImport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const parsed = JSON.parse(value);
      const response = await fetch("/api/inspo/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });
      const result = (await response.json()) as {
        imported: number;
        updated: number;
        skipped: number;
      };
      setMessage(`Imported ${result.imported}, updated ${result.updated}, skipped ${result.skipped}.`);
      onImported();
    } catch (error) {
      setMessage((error as Error).message || "Failed to import.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Import JSON</div>
        <div style={{ fontSize: 14, color: "#64748b" }}>
          Paste the inspo JSON pack. We will clean language and save everything in bulk.
        </div>
        <textarea
          style={textareaStyle}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Paste JSON here..."
        />
        {message ? (
          <div style={{ fontSize: 13, color: "#334155" }}>{message}</div>
        ) : null}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <ActionButton label="Close" variant="secondary" onClick={onClose} />
          <ActionButton label={loading ? "Importing..." : "Validate & import"} onClick={handleImport} />
        </div>
      </div>
    </div>
  );
}
