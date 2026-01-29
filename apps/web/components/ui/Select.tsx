import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string;
};

export default function Select({ className, ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20",
        className
      )}
    />
  );
}
