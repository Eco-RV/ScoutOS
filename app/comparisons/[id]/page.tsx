import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice, formatStorage, storeDiscountPct } from "@/lib/format";
import { canonicalBrand } from "@/lib/brands";
import { buildComparisonPrompt } from "@/lib/comparison";
import { storeName } from "@/lib/scrapers";
import AiPrompt from "@/components/AiPrompt";

export const dynamic = "force-dynamic";

export default async function ComparisonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comparison = await prisma.comparison.findUnique({
    where: { id: Number(id) },
    include: { items: { include: { product: true }, orderBy: { productId: "asc" } } },
  });
  if (!comparison) notFound();

  const products = comparison.items.map((i) => i.product);
  const prompt = buildComparisonPrompt(products);

  const rows: [string, (p: (typeof products)[number]) => string][] = [
    ["Tienda", (p) => storeName(p.store)],
    ["Marca", (p) => (p.brand ? canonicalBrand(p.brand) : "—")],
    ["Precio actual", (p) => formatPrice(p.currentPrice)],
    ["Precio de lista", (p) => (p.listPrice ? formatPrice(p.listPrice) : "—")],
    ["Descuento de la tienda", (p) => (storeDiscountPct(p) > 0 ? `-${storeDiscountPct(p)}%` : "—")],
    ["Precio más bajo visto", (p) => formatPrice(p.lowestPrice)],
    ["Procesador", (p) => p.cpu ?? "—"],
    ["RAM", (p) => (p.ramGb ? `${p.ramGb} GB` : "—")],
    ["Almacenamiento", (p) => (p.storageGb ? `${formatStorage(p.storageGb)} ${p.storageType ?? ""}`.trim() : "—")],
    ["Pantalla", (p) => (p.screenIn ? `${p.screenIn}"` : "—")],
    ["Gráficos", (p) => p.gpu ?? "—"],
    ["Disponibilidad", (p) => (p.inStock ? "En stock" : "Agotado")],
  ];

  return (
    <div className="space-y-6">
      <Link href="/comparisons" className="text-sm text-muted hover:text-foreground">← Comparaciones</Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{comparison.name}</h1>
        <p className="text-sm text-muted">{products.length} laptops</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="p-3 text-left font-medium text-muted" />
              {products.map((p) => (
                <th key={p.id} className="min-w-48 p-3 text-left align-top font-medium">
                  <Link href={`/products/${p.id}`} className="hover:text-accent">{p.title}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, render]) => (
              <tr key={label} className="border-b border-line last:border-0">
                <th className="whitespace-nowrap p-3 text-left font-medium text-muted">{label}</th>
                {products.map((p) => (
                  <td key={p.id} className="p-3">{render(p)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="p-3 text-left font-medium text-muted">Enlace</th>
              {products.map((p) => (
                <td key={p.id} className="p-3">
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    Ver en la tienda ↗
                  </a>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <AiPrompt comparisonId={comparison.id} prompt={prompt} savedResult={comparison.aiResult} />
    </div>
  );
}
