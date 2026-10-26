import { NextResponse } from "next/server";
import { runAllSources, runSource } from "@/lib/ingest";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Body `{ sourceId }` re-scrapes one link; an empty body re-scrapes every active link. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { sourceId?: number };
  const results = body.sourceId ? [await runSource(body.sourceId)] : await runAllSources();
  return NextResponse.json(results);
}
