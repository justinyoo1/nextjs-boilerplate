import { describe, expect, it } from "vitest";
import { recencyWeight, topicStats } from "./mastery";

const TODAY = "2026-10-14";

function session(date: string, topics: [string, number][]) {
  return {
    session_date: date,
    session_topics: topics.map(([topic, mastery]) => ({ topic, mastery })),
  };
}

describe("recencyWeight", () => {
  it("is 1 for today", () => {
    expect(recencyWeight(0)).toBe(1);
  });
  it("is 0.5 after one half-life", () => {
    expect(recencyWeight(21)).toBeCloseTo(0.5);
  });
  it("is 0.25 after two half-lives", () => {
    expect(recencyWeight(42)).toBeCloseTo(0.25);
  });
  it("never exceeds 1 for future dates", () => {
    expect(recencyWeight(-10)).toBe(1);
  });
});

describe("topicStats", () => {
  it("returns an empty list when there are no sessions", () => {
    expect(topicStats([], TODAY)).toEqual([]);
  });

  it("returns an empty list when sessions have no topics", () => {
    expect(topicStats([session(TODAY, [])], TODAY)).toEqual([]);
  });

  it("handles a single topic in a single session", () => {
    expect(topicStats([session(TODAY, [["Fractions", 4]])], TODAY)).toEqual([
      { name: "Fractions", avg: 4, count: 1 },
    ]);
  });

  it("gives equal weight to scores from the same day", () => {
    const stats = topicStats(
      [session(TODAY, [["Fractions", 4]]), session(TODAY, [["Fractions", 5]])],
      TODAY
    );
    expect(stats[0].avg).toBeCloseTo(4.5);
    expect(stats[0].count).toBe(2);
  });

  it("weights a score from one half-life ago at half strength", () => {
    // (0.5 * 2 + 1 * 5) / (0.5 + 1) = 4
    const stats = topicStats(
      [session("2026-09-23", [["Fractions", 2]]), session(TODAY, [["Fractions", 5]])],
      TODAY
    );
    expect(stats[0].avg).toBeCloseTo(4);
  });

  it("lets a recent score dominate a much older one", () => {
    const stats = topicStats(
      [session("2026-08-15", [["Fractions", 1]]), session(TODAY, [["Fractions", 5]])],
      TODAY
    );
    expect(stats[0].avg).toBeGreaterThan(4.4);
    expect(stats[0].avg).toBeLessThan(5);
  });

  it("treats topic names as the same regardless of case or extra spaces", () => {
    const stats = topicStats(
      [session(TODAY, [["Quadratics", 2]]), session(TODAY, [["  quadratics ", 3]])],
      TODAY
    );
    expect(stats).toHaveLength(1);
    expect(stats[0].name).toBe("Quadratics");
    expect(stats[0].avg).toBeCloseTo(2.5);
    expect(stats[0].count).toBe(2);
  });

  it("sorts the weakest topic first", () => {
    const stats = topicStats(
      [session(TODAY, [["Fractions", 5], ["Quadratics", 2], ["Geometry", 3]])],
      TODAY
    );
    expect(stats.map((s) => s.name)).toEqual(["Quadratics", "Geometry", "Fractions"]);
  });
});
