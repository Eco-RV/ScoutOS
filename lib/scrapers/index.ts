import { magento } from "./magento";
import type { Adapter, ScrapedProduct } from "./types";
import { vtex } from "./vtex";
import { woocommerce } from "./woocommerce";

export interface Store {
  id: string;
  name: string;
  hosts: string[];
  adapter: Adapter;
  /** Blocks automated requests; products arrive only through the /import bookmarklet. */
  browserOnly?: boolean;
}

export const STORES: Store[] = [
  { id: "siman", name: "Siman", hosts: ["cr.siman.com"], adapter: vtex },
  { id: "walmart", name: "Walmart", hosts: ["walmart.co.cr", "www.walmart.co.cr"], adapter: vtex },
  { id: "tiendahp", name: "Tienda HP", hosts: ["tiendahp.co.cr", "www.tiendahp.co.cr"], adapter: magento },
  { id: "zentech", name: "Zentech", hosts: ["zentechcr.net", "www.zentechcr.net"], adapter: woocommerce },
  { id: "extremetech", name: "ExtremeTech", hosts: ["extremetechcr.com", "www.extremetechcr.com"], adapter: woocommerce, browserOnly: true },
  { id: "extremeoutlet", name: "Extreme Outlet", hosts: ["extremeoutletcr.com", "www.extremeoutletcr.com"], adapter: woocommerce },
];

export function storeForUrl(raw: string): { store: Store; url: URL } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("El link no es una URL válida");
  }
  const store = STORES.find((s) => s.hosts.includes(url.hostname.toLowerCase()));
  if (!store) {
    throw new Error(
      `Tienda no soportada (${url.hostname}). Soportadas: ${STORES.map((s) => s.hosts[0]).join(", ")}`,
    );
  }
  return { store, url };
}

export const storeName = (id: string) => STORES.find((s) => s.id === id)?.name ?? id;

const LAPTOP = /laptop|notebook|port[aá]til|macbook|chromebook|ultrabook|2 en 1/i;
// Accessories usually *start* with what they are ("Funda para laptop ...").
const ACCESSORY =
  /^(funda|mochila|bolso|malet[ií]n|estuche|cargador|adaptador|soporte|base|stand|cable|hub|docking|teclado|mouse|memoria|disco|bater[ií]a|protector|cooler|kit|candado)\b/i;

// Other devices that stores misfile under "Laptops" (Walmart does this).
const OTHER_DEVICE = /\b(tablet|ipad|monitor|impresora|celular|smartphone|televisor|proyector|smartwatch|aud[ií]fonos)\b/i;

export function isLaptop(p: Pick<ScrapedProduct, "title" | "categories">): boolean {
  if (ACCESSORY.test(p.title.trim())) return false;
  if (LAPTOP.test(p.title)) return true;
  if (OTHER_DEVICE.test(p.title)) return false;
  return (p.categories ?? []).some((c) => /laptop|port[aá]til|notebook/i.test(c) && !/accesorio/i.test(c));
}

export type { ScrapedProduct, ScrapeResult, SourceType } from "./types";
