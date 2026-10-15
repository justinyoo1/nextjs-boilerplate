export type TopicStat = { name: string; avg: number; count: number };

type SessionLike = {
  session_topics: { topic: string; mastery: number }[];
};

// Average mastery per topic (case-insensitive), weakest first
export function topicStats(sessions: SessionLike[]): TopicStat[] {
  const groups = new Map<string, { name: string; scores: number[] }>();

  for (const s of sessions) {
    for (const t of s.session_topics) {
      const key = t.topic.trim().toLowerCase();
      const g = groups.get(key) ?? { name: t.topic.trim(), scores: [] };
      g.scores.push(t.mastery);
      groups.set(key, g);
    }
  }

  return Array.from(groups.values())
    .map((g) => ({
      name: g.name,
      avg: g.scores.reduce((a, b) => a + b, 0) / g.scores.length,
      count: g.scores.length,
    }))
    .sort((a, b) => a.avg - b.avg);
}
