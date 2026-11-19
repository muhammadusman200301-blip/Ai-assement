import { NextResponse } from "next/server";
import { GenerateRequest, QuestionSet } from "@/lib/schemas";
import { structuredCompletion } from "@/lib/llm";

export async function POST(req: Request) {
  const body = GenerateRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message }, { status: 400 });
  }
  const { role, level, count } = body.data;

  try {
    const { data, model, attempts } = await structuredCompletion(QuestionSet, {
      system:
        "You write practical technical interview questions. Return JSON only: " +
        '{"questions":[{"id":"q1","topic":"...","question":"...","rubric":["point","point"]}]}. ' +
        "Each rubric lists 2 to 6 concrete points a strong answer must cover.",
      user: `Role: ${role}\nLevel: ${level}\nWrite ${count} questions that test real, hands-on skill for this role and level.`,
    });

    return NextResponse.json({ ...data, meta: { model, attempts } });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Could not generate questions right now. Please try again." },
      { status: 502 }
    );
  }
}
