import { NextResponse } from "next/server";
import { runAllSources, runSource } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Body `{ sourceId }` re-scrapes one link; an empty body re-scrapes every active link. */
export async function POST(req: Request) {
  const { sourceId } = (await req.json().catch(() => ({}))) as { sourceId?: unknown };
  if (sourceId !== undefined && !(typeof sourceId === "number" && Number.isInteger(sourceId) && sourceId > 0)) {
    return NextResponse.json({ error: "sourceId inválido" }, { status: 400 });
  }
  const results = typeof sourceId === "number" ? [await runSource(sourceId)] : await runAllSources();
  return NextResponse.json(results);
}
