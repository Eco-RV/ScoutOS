import { prisma } from "@/lib/db";
import { STORES } from "@/lib/scrapers";
import SourcesManager from "@/components/SourcesManager";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await prisma.source.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Links</h1>
        <p className="text-sm text-muted">
          Pega el link de una laptop o de una categoría/búsqueda. Tiendas soportadas:{" "}
          {STORES.map((s) => s.name).join(", ")}.
        </p>
      </div>
      <SourcesManager initial={JSON.parse(JSON.stringify(sources))} />
    </div>
  );
}
