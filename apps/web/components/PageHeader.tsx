import type { ReactNode } from "react";
import InlineTip from "./InlineTip";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  tip?: string;
};

export default function PageHeader({ title, description, actions, tip }: PageHeaderProps) {
  return (
    <header
      className="page-header"
      style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 32 }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontWeight: 800,
              letterSpacing: -1,
              lineHeight: 1.1,
              marginBottom: description ? 12 : 0
            }}
            className="text-slate-900"
          >
            {title}
          </h1>
          {tip ? <InlineTip text={tip} /> : null}
        </div>
        {description ? (
          <p style={{ fontSize: "clamp(14px, 1.6vw, 17px)", maxWidth: "min(600px, 100%)" }} className="text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="page-header-actions" style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {actions}
        </div>
      ) : null}
    </header>
  );
}
