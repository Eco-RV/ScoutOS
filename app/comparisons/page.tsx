import Link from "next/link";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ComparisonsPage() {
  const comparisons = await prisma.comparison.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  if (!comparisons.length) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold">Todavía no hay comparaciones</h1>
        <p className="mt-2 text-muted">En el listado de laptops marca 2 o más y pulsa Comparar.</p>
        <Link href="/" className="btn mt-6 inline-block">Ver laptops</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Análisis" title="Comparaciones">
        Laptops guardadas lado a lado. Cada comparación puede llevar un análisis de IA.
      </PageHeader>
      <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
        {comparisons.map((c) => (
          <li key={c.id}>
            <Link href={`/comparisons/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-background">
              <span className="font-medium">{c.name}</span>
              <span className="text-sm text-muted">
                {c._count.items} laptops · {c.aiResult ? "con análisis IA" : "sin análisis"} · {timeAgo(c.createdAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
