import { describe, expect, it } from "vitest";
import { topicStats } from "./mastery";

function session(topics: [string, number][]) {
  return { session_topics: topics.map(([topic, mastery]) => ({ topic, mastery })) };
}

describe("topicStats", () => {
  it("returns an empty list when there are no sessions", () => {
    expect(topicStats([])).toEqual([]);
  });

  it("returns an empty list when sessions have no topics", () => {
    expect(topicStats([session([])])).toEqual([]);
  });

  it("handles a single topic in a single session", () => {
    expect(topicStats([session([["Fractions", 4]])])).toEqual([
      { name: "Fractions", avg: 4, count: 1 },
    ]);
  });

  it("averages scores for the same topic across sessions", () => {
    const stats = topicStats([
      session([["Fractions", 4]]),
      session([["Fractions", 5]]),
    ]);
    expect(stats).toEqual([{ name: "Fractions", avg: 4.5, count: 2 }]);
  });

  it("treats topic names as the same regardless of case or extra spaces", () => {
    const stats = topicStats([
      session([["Quadratics", 2]]),
      session([["  quadratics ", 3]]),
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0].name).toBe("Quadratics");
    expect(stats[0].avg).toBe(2.5);
    expect(stats[0].count).toBe(2);
  });

  it("sorts the weakest topic first", () => {
    const stats = topicStats([
      session([["Fractions", 5], ["Quadratics", 2], ["Geometry", 3]]),
    ]);
    expect(stats.map((s) => s.name)).toEqual(["Quadratics", "Geometry", "Fractions"]);
  });
});
