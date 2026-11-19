import { describe, expect, it } from "vitest";
import { bandFor, buildReport, scoreItem } from "../lib/scoring";
import type { Question } from "../lib/schemas";

const q = (id: string, n = 4): Question => ({
  id,
  topic: "APIs",
  question: "How would you make a payment webhook safe to retry?",
  rubric: Array.from({ length: n }, (_, i) => `point ${i}`),
});

describe("scoreItem", () => {
  it("scores by share of rubric points covered", () => {
    const r = scoreItem(q("q1"), { id: "q1", covered: [0, 2], feedback: "ok" });
    expect(r.score).toBe(50);
    expect(r.covered).toEqual(["point 0", "point 2"]);
    expect(r.missed).toEqual(["point 1", "point 3"]);
  });

  it("ignores out-of-range and duplicate indexes from the model", () => {
    const r = scoreItem(q("q1"), { id: "q1", covered: [1, 1, 9, -1], feedback: "" });
    expect(r.score).toBe(25);
  });
});

describe("buildReport", () => {
  it("averages item scores and gives zero to ungraded questions", () => {
    const report = buildReport(
      [q("q1"), q("q2")],
      [{ id: "q1", covered: [0, 1, 2, 3], feedback: "great" }]
    );
    expect(report.items.map((i) => i.score)).toEqual([100, 0]);
    expect(report.overall).toBe(50);
    expect(report.band).toBe("Solid");
  });
});

describe("bandFor", () => {
  it("maps scores to bands", () => {
    expect(bandFor(80)).toBe("Strong");
    expect(bandFor(60)).toBe("Solid");
    expect(bandFor(20)).toBe("Needs work");
  });
});
