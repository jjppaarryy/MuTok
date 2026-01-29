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
    <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1, marginBottom: description ? 12 : 0 }} className="text-slate-900">
            {title}
          </h1>
          {tip ? <InlineTip text={tip} /> : null}
        </div>
        {description ? (
          <p style={{ fontSize: 17, maxWidth: 600 }} className="text-slate-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{actions}</div> : null}
    </header>
  );
}
