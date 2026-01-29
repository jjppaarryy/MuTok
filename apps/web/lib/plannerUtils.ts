export const safeCategories = ["DAW_screen", "Abstract_visual"];

export const pickRandom = <T,>(items: T[]) => {
  return items[Math.floor(Math.random() * items.length)];
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
