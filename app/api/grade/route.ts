import { NextResponse } from "next/server";
import { GradeRequest, GradeSet } from "@/lib/schemas";
import { structuredCompletion, LlmError } from "@/lib/llm";
import { buildReport } from "@/lib/scoring";

export async function POST(req: Request) {
  const body = GradeRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message }, { status: 400 });
  }
  const { role, level, items } = body.data;

  const prompt = items
    .map(
      ({ question, answer }) =>
        `ID: ${question.id}\nQuestion: ${question.question}\nRubric:\n` +
        question.rubric.map((r, i) => `  [${i}] ${r}`).join("\n") +
        `\nAnswer: ${answer.trim() || "(no answer)"}`
    )
    .join("\n\n---\n\n");

  try {
    const { data, model, attempts } = await structuredCompletion(GradeSet, {
      system:
        `You grade answers for a ${level} ${role}. For each item, list the indexes of rubric points ` +
        "the answer clearly covers, and give one or two sentences of specific feedback. " +
        'Be strict: vague mentions do not count. Return JSON only: {"grades":[{"id":"q1","covered":[0,2],"feedback":"..."}]}',
      user: prompt,
    });

    const report = buildReport(
      items.map((i) => i.question),
      data.grades
    );
    return NextResponse.json({ ...report, meta: { model, attempts } });
  } catch (err) {
    console.error(err);
    const reason = err instanceof LlmError ? err.reason : "unknown";
    return NextResponse.json(
      { reason, error: "Could not grade answers right now. Please try again." },
      { status: 502 }
    );
  }
}
