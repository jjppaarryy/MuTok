import type { ReactNode } from "react";
import Badge from "./ui/Badge";

type SectionHeaderProps = {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
};

export default function SectionHeader({ title, description, badge, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {badge ? <Badge>{badge}</Badge> : null}
        </div>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
