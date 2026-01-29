# Theme TODO (TikTok Creator Center look)

We switched globals.css + some key components/pages to light mode.
Remaining work:

- Replace remaining `text-white/...` usages with `text-slate-...` across all routes:
  - app/connect
  - app/assets
  - app/rules
  - app/queue
  - app/analytics
  - app/logs
  - app/brain
- Standardize page header pattern (Title + description + actions) everywhere.
- Introduce `components/PageHeader.tsx` and `components/SectionHeader.tsx` to remove repeated markup.
- Add Dashboard "How it works" stepper + "Blocked" callouts.
