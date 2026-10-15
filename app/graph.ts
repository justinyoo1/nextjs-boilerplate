export type Edge = { topic: string; prereq: string };

// A topic is "mastered" at a weighted average of at least this much.
export const MASTERED = 4;

export const norm = (s: string) => s.trim().toLowerCase();

// Adjacency list pointing from a prerequisite to the topics it unlocks.
function unlocks(edges: Edge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const e of edges) {
    const from = norm(e.prereq);
    map.set(from, [...(map.get(from) ?? []), norm(e.topic)]);
  }
  return map;
}

// Would adding "topic requires prereq" create a loop? It would if `topic`
// can already reach `prereq` by following unlock edges (iterative DFS).
export function wouldCreateCycle(edges: Edge[], topic: string, prereq: string): boolean {
  const start = norm(topic);
  const target = norm(prereq);
  if (start === target) return true;

  const next = unlocks(edges);
  const seen = new Set<string>([start]);
  const stack = [start];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === target) return true;
    for (const n of next.get(current) ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return false;
}

// Kahn's algorithm: every topic appears after all of its prerequisites.
// Returns null if the graph has a cycle.
export function topologicalOrder(edges: Edge[]): string[] | null {
  const next = unlocks(edges);
  const inDegree = new Map<string, number>();

  for (const e of edges) {
    if (!inDegree.has(norm(e.prereq))) inDegree.set(norm(e.prereq), 0);
    inDegree.set(norm(e.topic), (inDegree.get(norm(e.topic)) ?? 0) + 1);
  }

  const queue = Array.from(inDegree.keys())
    .filter((k) => inDegree.get(k) === 0)
    .sort();
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    order.push(current);
    for (const n of next.get(current) ?? []) {
      const d = (inDegree.get(n) ?? 0) - 1;
      inDegree.set(n, d);
      if (d === 0) queue.push(n);
    }
  }
  return order.length === inDegree.size ? order : null;
}

// The earliest unmastered topic whose prerequisites are all mastered.
// Topics with no prerequisites compete by weakest average, so with an
// empty graph this is just "weakest topic first".
export function recommendNext(
  stats: { name: string; avg: number }[],
  edges: Edge[],
  threshold = MASTERED
): string | null {
  const avg = new Map<string, number>();
  const names = new Map<string, string>();

  for (const s of stats) {
    avg.set(norm(s.name), s.avg);
    names.set(norm(s.name), s.name.trim());
  }
  for (const e of edges) {
    for (const raw of [e.topic, e.prereq]) {
      if (!names.has(norm(raw))) names.set(norm(raw), raw.trim());
    }
  }

  const mastered = (key: string) => (avg.get(key) ?? 0) >= threshold;

  const order = topologicalOrder(edges) ?? [];
  const position = new Map<string, number>();
  order.forEach((key, i) => position.set(key, i));

  const candidates = Array.from(names.keys()).filter(
    (key) =>
      !mastered(key) &&
      edges.filter((e) => norm(e.topic) === key).every((e) => mastered(norm(e.prereq)))
  );

  candidates.sort(
    (a, b) =>
      (position.get(a) ?? order.length) - (position.get(b) ?? order.length) ||
      (avg.get(a) ?? 0) - (avg.get(b) ?? 0) ||
      a.localeCompare(b)
  );

  return candidates.length > 0 ? (names.get(candidates[0]) ?? null) : null;
}
