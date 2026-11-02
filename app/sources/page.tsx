import { prisma } from "@/lib/db";
import { STORES } from "@/lib/scrapers";
import PageHeader from "@/components/PageHeader";
import SourcesManager, { type StoreInfo } from "@/components/SourcesManager";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const [sources, counts] = await Promise.all([
    prisma.source.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.product.groupBy({ by: ["store"], _count: true }),
  ]);

  const stores: StoreInfo[] = STORES.map((s) => {
    const mine = sources.filter((x) => x.store === s.id);
    const runs = mine.flatMap((x) => (x.lastRunAt ? [x.lastRunAt.getTime()] : []));
    return {
      id: s.id,
      name: s.name,
      hosts: s.hosts,
      platform: s.platform,
      method: s.method,
      example: s.example,
      browserOnly: !!s.browserOnly,
      laptops: counts.find((c) => c.store === s.id)?._count ?? 0,
      linkCount: mine.length,
      lastRunAt: runs.length ? new Date(Math.max(...runs)).toISOString() : null,
      error: mine.find((x) => x.lastError)?.lastError ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Tiendas" title="Tiendas y links">
        ScoutOS sigue {STORES.length} tiendas. Cada una tiene su forma de leerla: API, HTML o el marcador del navegador.
        Pega un link de categoría o de producto y lo revisamos cada 6 h.
      </PageHeader>
      <SourcesManager
        stores={stores}
        initial={JSON.parse(JSON.stringify(sources))}
      />
    </div>
  );
}
