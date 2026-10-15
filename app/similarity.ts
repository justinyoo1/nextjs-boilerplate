// Levenshtein distance: the minimum number of single-character edits
// (insert, delete, substitute) needed to turn one string into the other.
export function levenshtein(a: string, b: string): number {
  const s = a.trim().toLowerCase();
  const t = b.trim().toLowerCase();

  // prev[j] = distance between the first i characters of s and the first j of t
  const prev = Array.from({ length: t.length + 1 }, (_, j) => j);

  for (let i = 1; i <= s.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const above = prev[j];
      prev[j] = Math.min(
        prev[j] + 1, // delete a character
        prev[j - 1] + 1, // insert a character
        diagonal + (s[i - 1] === t[j - 1] ? 0 : 1) // substitute (free if equal)
      );
      diagonal = above;
    }
  }
  return prev[t.length];
}

// Returns the closest existing topic if it is a near-miss of `name`, else null.
export function findSimilarTopic(name: string, existing: string[]): string | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;

  let best: string | null = null;
  let bestDistance = Infinity;

  for (const candidate of existing) {
    const c = candidate.trim().toLowerCase();
    if (c === n) return null; // exact match: nothing to suggest
    const d = levenshtein(n, c);
    const limit = Math.max(1, Math.floor(Math.max(n.length, c.length) * 0.25));
    if (d <= limit && d < bestDistance) {
      best = candidate.trim();
      bestDistance = d;
    }
  }
  return best;
}
