export const safeCategories = ["calm", "neutral"];

export const pickRandom = <T,>(items: T[]) => {
  return items[Math.floor(Math.random() * items.length)];
};

/** Fisher–Yates shuffle; mutates and returns the array. */
export const shuffle = <T,>(items: T[]): T[] => {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

export const pickMany = <T,>(items: T[], count: number) => {
  const pool = [...items];
  const result: T[] = [];
  while (pool.length > 0 && result.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
};

export const pickTemplate = (templates: unknown) => {
  if (!Array.isArray(templates) || templates.length === 0) {
    return "";
  }
  return pickRandom(templates) as string;
};

export const addCaptionMarker = (caption: string, prefix: string) => {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${caption} ${prefix}${suffix}`.trim();
};
