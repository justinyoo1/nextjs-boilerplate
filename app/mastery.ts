export type TopicStat = { name: string; avg: number; count: number };

type SessionLike = {
  session_date: string; // YYYY-MM-DD
  session_topics: { topic: string; mastery: number }[];
};

// A score's weight halves every HALF_LIFE_DAYS days.
export const HALF_LIFE_DAYS = 21;

// Whole days since 1970 for a YYYY-MM-DD string (timezone-independent).
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

// Exponential decay: 1 for today, 0.5 after one half-life, 0.25 after two...
export function recencyWeight(ageDays: number, halfLife = HALF_LIFE_DAYS): number {
  return Math.pow(0.5, Math.max(0, ageDays) / halfLife);
}

// Recency-weighted average mastery per topic (case-insensitive), weakest first.
// `today` is passed in (YYYY-MM-DD) so the function stays pure and testable.
export function topicStats(sessions: SessionLike[], today: string): TopicStat[] {
  const now = dayNumber(today);
  const groups = new Map<
    string,
    { name: string; weightedSum: number; weightTotal: number; count: number }
  >();

  for (const s of sessions) {
    const weight = recencyWeight(now - dayNumber(s.session_date));
    for (const t of s.session_topics) {
      const key = t.topic.trim().toLowerCase();
      const g = groups.get(key) ?? {
        name: t.topic.trim(),
        weightedSum: 0,
        weightTotal: 0,
        count: 0,
      };
      g.weightedSum += weight * t.mastery;
      g.weightTotal += weight;
      g.count += 1;
      groups.set(key, g);
    }
  }

  return Array.from(groups.values())
    .map((g) => ({
      name: g.name,
      avg: g.weightedSum / g.weightTotal,
      count: g.count,
    }))
    .sort((a, b) => a.avg - b.avg);
}
