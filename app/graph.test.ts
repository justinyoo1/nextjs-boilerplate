import { describe, expect, it } from "vitest";
import { recommendNext, topologicalOrder, wouldCreateCycle } from "./graph";

// e("Fractions", "Linear equations") means Fractions is a prerequisite of Linear equations
const e = (prereq: string, topic: string) => ({ prereq, topic });
const chain = [e("Fractions", "Linear equations"), e("Linear equations", "Quadratics")];
const diamond = [e("a", "b"), e("a", "c"), e("b", "d"), e("c", "d")];

describe("wouldCreateCycle", () => {
  it("rejects a topic as its own prerequisite", () => {
    expect(wouldCreateCycle([], "A", "A")).toBe(true);
  });
  it("rejects a direct loop", () => {
    expect(wouldCreateCycle([e("A", "B")], "A", "B")).toBe(true);
  });
  it("rejects an indirect loop", () => {
    expect(wouldCreateCycle(chain, "Fractions", "Quadratics")).toBe(true);
  });
  it("ignores case and surrounding spaces", () => {
    expect(wouldCreateCycle(chain, "  fractions ", "QUADRATICS")).toBe(true);
  });
  it("allows a redundant shortcut", () => {
    expect(wouldCreateCycle(chain, "Quadratics", "Fractions")).toBe(false);
  });
  it("allows edges that rejoin in a diamond", () => {
    expect(wouldCreateCycle(diamond, "d", "a")).toBe(false);
  });
  it("allows an unrelated edge", () => {
    expect(wouldCreateCycle(chain, "Geometry", "Fractions")).toBe(false);
  });
});

describe("topologicalOrder", () => {
  it("returns an empty list for no edges", () => {
    expect(topologicalOrder([])).toEqual([]);
  });
  it("orders a chain", () => {
    expect(topologicalOrder(chain)).toEqual(["fractions", "linear equations", "quadratics"]);
  });
  it("puts every topic after its prerequisites in a diamond", () => {
    const order = topologicalOrder(diamond) as string[];
    expect(order).toEqual(["a", "b", "c", "d"]);
  });
  it("returns null when there is a cycle", () => {
    expect(topologicalOrder([e("a", "b"), e("b", "a")])).toBeNull();
  });
});

describe("recommendNext", () => {
  it("falls back to the weakest topic when there are no prerequisites", () => {
    const stats = [
      { name: "Fractions", avg: 5 },
      { name: "Quadratics", avg: 2 },
      { name: "Geometry", avg: 3 },
    ];
    expect(recommendNext(stats, [])).toBe("Quadratics");
  });
  it("starts at the foundation when it is not mastered", () => {
    expect(recommendNext([{ name: "Fractions", avg: 2 }], chain)).toBe("Fractions");
  });
  it("unlocks the next topic once its prerequisite is mastered", () => {
    expect(recommendNext([{ name: "Fractions", avg: 5 }], chain)).toBe("Linear equations");
  });
  it("counts exactly the threshold as mastered", () => {
    expect(recommendNext([{ name: "Fractions", avg: 4 }], chain)).toBe("Linear equations");
  });
  it("moves on to the last topic when everything before it is mastered", () => {
    const stats = [
      { name: "Fractions", avg: 5 },
      { name: "Linear equations", avg: 4.5 },
      { name: "Quadratics", avg: 2 },
    ];
    expect(recommendNext(stats, chain)).toBe("Quadratics");
  });
  it("returns null when every topic is mastered", () => {
    const stats = [
      { name: "Fractions", avg: 5 },
      { name: "Linear equations", avg: 5 },
      { name: "Quadratics", avg: 5 },
    ];
    expect(recommendNext(stats, chain)).toBeNull();
  });
  it("returns null when there is no data at all", () => {
    expect(recommendNext([], [])).toBeNull();
  });
});
