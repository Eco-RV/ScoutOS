import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runSource } from "@/lib/ingest";
import { storeForUrl } from "@/lib/scrapers";

export const runtime = "nodejs";

export async function GET() {
  const sources = await prisma.source.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(sources);
}

/** Add a link and scrape it right away so the user sees results. */
export async function POST(req: Request) {
  const { url } = (await req.json()) as { url?: string };
  if (!url) return NextResponse.json({ error: "Falta el link" }, { status: 400 });

  let store, parsed;
  try {
    ({ store, url: parsed } = storeForUrl(url));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const existing = await prisma.source.findUnique({ where: { url: parsed.href } });
  if (existing) return NextResponse.json({ error: "Ese link ya está agregado" }, { status: 409 });

  const source = await prisma.source.create({
    data: { url: parsed.href, store: store.id, type: "listing" },
  });
  const summary = await runSource(source.id);
  return NextResponse.json({ source, summary }, { status: 201 });
}
