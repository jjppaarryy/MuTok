import type { ReactNode } from "react";
import clsx from "clsx";

type BadgeProps = {
  children: ReactNode;
  variant?: "neutral" | "accent";
  className?: string;
};

export default function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-5 py-2 text-xs font-medium leading-none",
        variant === "accent"
          ? "bg-[var(--accent)] text-white"
          : "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
        className
      )}
    >
      {children}
    </span>
  );
}
