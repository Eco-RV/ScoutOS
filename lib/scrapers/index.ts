import { browserCards } from "./cards";
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
  platform: string;
  /** How ScoutOS reads the store, in plain words. */
  method: string;
  /** A category link that works for this store. */
  example: string;
}

export const STORES: Store[] = [
  {
    id: "siman", name: "Siman", hosts: ["cr.siman.com"], adapter: vtex,
    platform: "VTEX", method: "API pública de catálogo",
    example: "https://cr.siman.com/tecnologia/computadoras/laptops",
  },
  {
    id: "walmart", name: "Walmart", hosts: ["walmart.co.cr", "www.walmart.co.cr"], adapter: vtex,
    platform: "VTEX", method: "API pública de catálogo",
    example: "https://www.walmart.co.cr/electronica/computacion/laptops",
  },
  {
    id: "tiendahp", name: "Tienda HP", hosts: ["tiendahp.co.cr", "www.tiendahp.co.cr"], adapter: magento,
    platform: "Magento", method: "HTML de la tienda",
    example: "https://www.tiendahp.co.cr/laptops",
  },
  {
    id: "cfx", name: "CFX", hosts: ["cfx-cr.com", "www.cfx-cr.com"], adapter: magento,
    platform: "Magento", method: "HTML de la tienda",
    example: "https://cfx-cr.com/computadoras.html?cat=11",
  },
  {
    id: "zentech", name: "Zentech", hosts: ["zentechcr.net", "www.zentechcr.net"], adapter: woocommerce,
    platform: "WooCommerce", method: "API pública de la tienda",
    example: "https://zentechcr.net/categoria-producto/laptops-usadas/",
  },
  {
    id: "extremetech", name: "ExtremeTech", hosts: ["extremetechcr.com", "www.extremetechcr.com"], adapter: woocommerce, browserOnly: true,
    platform: "WooCommerce", method: "Marcador del navegador (la tienda bloquea bots)",
    example: "https://extremetechcr.com/product-category/computadoras/laptops/laptops-laptops/",
  },
  {
    id: "extremeoutlet", name: "Extreme Outlet", hosts: ["extremeoutletcr.com", "www.extremeoutletcr.com"], adapter: woocommerce,
    platform: "WooCommerce", method: "API pública de la tienda",
    example: "https://extremeoutletcr.com/?s=laptop",
  },
  {
    id: "compufax", name: "Compufax", hosts: ["compufaxcr.com", "www.compufaxcr.com"], adapter: browserCards, browserOnly: true,
    platform: "Alegra Shop", method: "Marcador del navegador (la tienda carga los productos con JavaScript)",
    example: "https://www.compufaxcr.com/laptop-gaming--59",
  },
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
  // A store's generic "Computadoras" category (CFX) holds laptops; "Computadoras de escritorio" does not match.
  return (p.categories ?? []).some(
    (c) => (/laptop|port[aá]til|notebook/i.test(c) || /^computadoras$/i.test(c.trim())) && !/accesorio/i.test(c),
  );
}

export type { ScrapedProduct, ScrapeResult, SourceType } from "./types";
