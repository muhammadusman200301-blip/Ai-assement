"use client";

import { useState } from "react";
import type { Question, Level } from "@/lib/schemas";
import type { Report } from "@/lib/scoring";

export default function Home() {
  const [role, setRole] = useState("Full Stack Engineer");
  const [level, setLevel] = useState<Level>("senior");
  const [count, setCount] = useState(3);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState<"gen" | "grade" | null>(null);
  const [error, setError] = useState("");

  async function post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Something went wrong");
    return json as T;
  }

  async function generate() {
    setLoading("gen");
    setError("");
    setReport(null);
    try {
      const data = await post<{ questions: Question[] }>("/api/generate", { role, level, count });
      setQuestions(data.questions);
      setAnswers({});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function grade() {
    setLoading("grade");
    setError("");
    try {
      const items = questions.map((q) => ({ question: q, answer: answers[q.id] ?? "" }));
      setReport(await post<Report>("/api/grade", { role, level, items }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <main>
      <h1>AI Assessment</h1>
      <p className="sub">Pick a role, answer the questions, and get rubric-based feedback.</p>

      <div className="card row">
        <div style={{ flex: 2, minWidth: 200 }}>
          <label>Role</label>
          <input value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label>Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </select>
        </div>
        <div style={{ width: 100 }}>
          <label>Questions</label>
          <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </div>
        <button onClick={generate} disabled={loading !== null || role.trim().length < 2}>
          {loading === "gen" ? "Generating…" : "Generate"}
        </button>
      </div>

      {error && <p className="err">{error}</p>}

      {questions.map((q, i) => (
        <div className="card" key={q.id}>
          <div className="topic">{i + 1}. {q.topic}</div>
          <div className="q">{q.question}</div>
          <textarea
            placeholder="Your answer…"
            value={answers[q.id] ?? ""}
            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
          />
        </div>
      ))}

      {questions.length > 0 && (
        <button onClick={grade} disabled={loading !== null}>
          {loading === "grade" ? "Grading…" : "Grade my answers"}
        </button>
      )}

      {report && (
        <div className="card" style={{ marginTop: 24 }}>
          <div>
            <span className="score">{report.overall}</span>/100
            <span className={`pill ${report.band.split(" ")[0]}`}>{report.band}</span>
          </div>
          {report.items.map((item, i) => (
            <div key={item.id} style={{ marginTop: 18 }}>
              <strong>Q{i + 1}: {item.score}/100</strong>
              <p className="muted">{item.feedback}</p>
              {item.covered.length > 0 && (<><div className="muted">Covered</div><ul>{item.covered.map((c) => <li key={c}>{c}</li>)}</ul></>)}
              {item.missed.length > 0 && (<><div className="muted">Missed</div><ul>{item.missed.map((m) => <li key={m}>{m}</li>)}</ul></>)}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
