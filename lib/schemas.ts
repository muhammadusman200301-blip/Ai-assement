import { z } from "zod";

export const Level = z.enum(["junior", "mid", "senior"]);
export type Level = z.infer<typeof Level>;

/** What the user asks for */
export const GenerateRequest = z.object({
  role: z.string().trim().min(2).max(80),
  level: Level,
  count: z.number().int().min(1).max(10).default(5),
});
export type GenerateRequest = z.infer<typeof GenerateRequest>;

/** One question as the LLM must return it */
export const Question = z.object({
  id: z.string(),
  topic: z.string(),
  question: z.string().min(10),
  /** Points a strong answer should cover. Used later as the grading rubric. */
  rubric: z.array(z.string()).min(2).max(6),
});
export type Question = z.infer<typeof Question>;

export const QuestionSet = z.object({
  questions: z.array(Question).min(1),
});
export type QuestionSet = z.infer<typeof QuestionSet>;

/** The candidate's answers */
export const GradeRequest = z.object({
  role: z.string(),
  level: Level,
  items: z
    .array(
      z.object({
        question: Question,
        answer: z.string().max(4000),
      })
    )
    .min(1),
});
export type GradeRequest = z.infer<typeof GradeRequest>;

/** How the LLM must grade one answer */
export const ItemGrade = z.object({
  id: z.string(),
  /** Which rubric points the answer covered, by index */
  covered: z.array(z.number().int().min(0)),
  feedback: z.string(),
});
export type ItemGrade = z.infer<typeof ItemGrade>;

export const GradeSet = z.object({
  grades: z.array(ItemGrade),
});
export type GradeSet = z.infer<typeof GradeSet>;
