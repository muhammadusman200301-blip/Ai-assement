import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

/** Health check: shows the configured models and whether the provider can see them. No secrets returned. */
export async function GET() {
  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  const primary = process.env.PRIMARY_MODEL?.trim() || "gpt-4o";
  const fallback = process.env.FALLBACK_MODEL?.trim() || "gpt-4o-mini";
  const host = baseURL ? new URL(baseURL).host : "api.openai.com";

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY?.trim(), baseURL });
    const list = await client.models.list();
    const ids = list.data.map((m) => m.id);
    return NextResponse.json({
      ok: ids.includes(primary) || ids.includes(fallback),
      host,
      primary: { name: primary, available: ids.includes(primary) },
      fallback: { name: fallback, available: ids.includes(fallback) },
      models: ids.slice(0, 40),
    });
  } catch (err) {
    const e = err as { status?: number; code?: string };
    return NextResponse.json(
      { ok: false, host, primary, fallback, reason: e?.code ?? `http_${e?.status ?? "unknown"}` },
      { status: 502 }
    );
  }
}
