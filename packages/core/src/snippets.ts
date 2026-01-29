export type SnippetCandidate = {
  startSec: number;
  durationSec: number;
  energyScore: number;
};

export function proposeSnippets(params: {
  durationSec: number;
  count?: number;
  minDuration?: number;
  maxDuration?: number;
}) {
  const count = params.count ?? 8;
  const minDuration = params.minDuration ?? 7;
  const maxDuration = params.maxDuration ?? 12;
  const span = Math.max(params.durationSec - maxDuration, 1);
  const step = span / count;
  const candidates: SnippetCandidate[] = [];

  for (let i = 0; i < count; i += 1) {
    const startSec = Math.max(0, Math.floor(i * step));
    const durationSec = Math.min(
      maxDuration,
      minDuration + (i % (maxDuration - minDuration + 1))
    );
    candidates.push({
      startSec,
      durationSec,
      energyScore: 3
    });
  }

  return candidates;
}
