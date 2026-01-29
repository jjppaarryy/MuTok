"use client";

import { useState } from "react";
import ActionButton from "../ActionButton";

type InspoFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
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
  gap: 16,
  maxHeight: "80vh",
  overflow: "auto"
};

const inputStyle: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
  width: "100%"
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  fontSize: 13,
  fontWeight: 600,
  color: "#475569"
};

export default function InspoFormModal({ open, onClose, onSaved }: InspoFormModalProps) {
  const [form, setForm] = useState({
    source: "",
    source_id: "",
    content_type: "",
    asset_type: "",
    link_original: "",
    copy_rewrite_universal: "",
    why_it_works: "",
    description: "",
    how_to_use: "",
    theme_tags: "",
    purpose_tags: "",
    hashtags: "",
    created_time: ""
  });
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setMessage(null);
    const payload = {
      ...form,
      theme_tags: form.theme_tags.split(",").map((item) => item.trim()).filter(Boolean),
      purpose_tags: form.purpose_tags.split(",").map((item) => item.trim()).filter(Boolean),
      hashtags: form.hashtags.split(",").map((item) => item.trim()).filter(Boolean)
    };
    const response = await fetch("/api/inspo/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setMessage("Save failed.");
      return;
    }
    setMessage("Inspo item saved.");
    onSaved();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Add inspo item</div>
        <div style={{ display: "grid", gap: 14 }}>
          <label style={labelStyle}>
            Source
            <input style={inputStyle} value={form.source} onChange={(e) => updateField("source", e.target.value)} />
          </label>
          <label style={labelStyle}>
            Source id
            <input style={inputStyle} value={form.source_id} onChange={(e) => updateField("source_id", e.target.value)} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <label style={labelStyle}>
              Content type
              <input style={inputStyle} value={form.content_type} onChange={(e) => updateField("content_type", e.target.value)} />
            </label>
            <label style={labelStyle}>
              Asset type
              <input style={inputStyle} value={form.asset_type} onChange={(e) => updateField("asset_type", e.target.value)} />
            </label>
          </div>
          <label style={labelStyle}>
            Original link
            <input style={inputStyle} value={form.link_original} onChange={(e) => updateField("link_original", e.target.value)} />
          </label>
          <label style={labelStyle}>
            Copy rewrite (universal)
            <textarea style={{ ...inputStyle, minHeight: 80 }} value={form.copy_rewrite_universal} onChange={(e) => updateField("copy_rewrite_universal", e.target.value)} />
          </label>
          <label style={labelStyle}>
            Why it works
            <textarea style={{ ...inputStyle, minHeight: 80 }} value={form.why_it_works} onChange={(e) => updateField("why_it_works", e.target.value)} />
          </label>
          <label style={labelStyle}>
            Description
            <textarea style={{ ...inputStyle, minHeight: 80 }} value={form.description} onChange={(e) => updateField("description", e.target.value)} />
          </label>
          <label style={labelStyle}>
            How to use
            <textarea style={{ ...inputStyle, minHeight: 80 }} value={form.how_to_use} onChange={(e) => updateField("how_to_use", e.target.value)} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <label style={labelStyle}>
              Theme tags (comma)
              <input style={inputStyle} value={form.theme_tags} onChange={(e) => updateField("theme_tags", e.target.value)} />
            </label>
            <label style={labelStyle}>
              Purpose tags (comma)
              <input style={inputStyle} value={form.purpose_tags} onChange={(e) => updateField("purpose_tags", e.target.value)} />
            </label>
          </div>
          <label style={labelStyle}>
            Hashtags (comma)
            <input style={inputStyle} value={form.hashtags} onChange={(e) => updateField("hashtags", e.target.value)} />
          </label>
          <label style={labelStyle}>
            Created time (ISO)
            <input style={inputStyle} value={form.created_time} onChange={(e) => updateField("created_time", e.target.value)} />
          </label>
        </div>
        {message ? <div style={{ fontSize: 13, color: "#334155" }}>{message}</div> : null}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <ActionButton label="Close" variant="secondary" onClick={onClose} />
          <ActionButton label="Save item" onClick={handleSave} />
        </div>
      </div>
    </div>
  );
}
