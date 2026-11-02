import { canonicalBrand } from "./brands";
import { formatPrice, formatStorage } from "./format";
import { storeName } from "./scrapers";

/** Fields of a product that go into the prompt for the AI. */
export interface ComparableProduct {
  title: string;
  store: string;
  url: string;
  brand: string | null;
  currentPrice: number;
  listPrice: number | null;
  lowestPrice: number;
  cpu: string | null;
  ramGb: number | null;
  storageGb: number | null;
  storageType: string | null;
  screenIn: number | null;
  gpu: string | null;
  inStock: boolean;
}

const HEADER = `Quiero comparar estas laptops de tiendas de Costa Rica. Los precios están en colones (₡).
Con base solo en los datos de abajo:
1. Ordénalas de mejor a peor relación entre precio y especificaciones.
2. Da pros y contras de cada una.
3. Recomienda una para estudio u oficina, una para juegos o diseño, y una para moverse mucho, si aplica.
4. Di qué no puedes evaluar con estos datos (pantalla, batería, teclado, ruido) en vez de suponerlo.
Responde en español.`;

const value = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "no disponible" : String(v));

export function buildComparisonPrompt(products: ComparableProduct[]): string {
  const blocks = products.map((p, i) =>
    [
      `Laptop ${i + 1}: ${p.title}`,
      `- Tienda: ${storeName(p.store)}`,
      `- Marca: ${p.brand ? canonicalBrand(p.brand) : "no disponible"}`,
      `- Precio actual: ${formatPrice(p.currentPrice)}`,
      `- Precio de lista: ${p.listPrice ? formatPrice(p.listPrice) : "no disponible"}`,
      `- Precio más bajo visto: ${formatPrice(p.lowestPrice)}`,
      `- Procesador: ${value(p.cpu)}`,
      `- RAM: ${value(p.ramGb && `${p.ramGb} GB`)}`,
      `- Almacenamiento: ${value(p.storageGb && `${formatStorage(p.storageGb)}${p.storageType ? ` ${p.storageType}` : ""}`)}`,
      `- Pantalla: ${value(p.screenIn && `${p.screenIn} pulgadas`)}`,
      `- Gráficos: ${value(p.gpu)}`,
      `- Disponibilidad: ${p.inStock ? "en stock" : "agotado"}`,
      `- Enlace: ${p.url}`,
    ].join("\n"),
  );
  return [HEADER, ...blocks].join("\n\n");
}
