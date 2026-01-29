import { useState } from "react";

type InlineTipProps = {
  text: string;
};

const tipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: 999,
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
  cursor: "help"
};

export default function InlineTip({ text }: InlineTipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span role="img" aria-label={text} style={tipStyle} tabIndex={0}>
        ?
      </span>
      {open ? (
        <span
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translate(-50%, 10px)",
            minWidth: 200,
            maxWidth: 260,
            padding: "10px 12px",
            borderRadius: 10,
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            fontSize: 12,
            lineHeight: 1.4,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.18)",
            zIndex: 20,
            whiteSpace: "normal"
          }}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
