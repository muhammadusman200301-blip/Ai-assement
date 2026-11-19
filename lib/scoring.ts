import type { ItemGrade, Question } from "./schemas";

export type ScoredItem = {
  id: string;
  score: number; // 0..100
  covered: string[];
  missed: string[];
  feedback: string;
};

export type Report = {
  overall: number; // 0..100
  band: "Needs work" | "Solid" | "Strong";
  items: ScoredItem[];
};

/**
 * Turn the LLM's rubric coverage into numbers we control.
 * The model only says WHICH rubric points were covered; the score itself
 * is computed here, so it is deterministic and easy to test.
 */
export function scoreItem(question: Question, grade: ItemGrade): ScoredItem {
  const valid = new Set(
    grade.covered.filter((i) => Number.isInteger(i) && i >= 0 && i < question.rubric.length)
  );
  const covered = question.rubric.filter((_, i) => valid.has(i));
  const missed = question.rubric.filter((_, i) => !valid.has(i));
  const score = question.rubric.length
    ? Math.round((covered.length / question.rubric.length) * 100)
    : 0;

  return { id: question.id, score, covered, missed, feedback: grade.feedback };
}

export function bandFor(overall: number): Report["band"] {
  if (overall >= 75) return "Strong";
  if (overall >= 50) return "Solid";
  return "Needs work";
}

export function buildReport(questions: Question[], grades: ItemGrade[]): Report {
  const byId = new Map(grades.map((g) => [g.id, g]));
  const items = questions.map((q) =>
    scoreItem(q, byId.get(q.id) ?? { id: q.id, covered: [], feedback: "No answer graded." })
  );
  const overall = items.length
    ? Math.round(items.reduce((sum, i) => sum + i.score, 0) / items.length)
    : 0;
  return { overall, band: bandFor(overall), items };
}
