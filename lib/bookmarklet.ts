/**
 * Source of the "Importar a ScoutOS" bookmarklet. It runs on the store page in
 * the user's own browser, reads the WooCommerce Store API for the category /
 * search / product being viewed (same URL mapping as filtersFor in
 * lib/scrapers/woocommerce.ts), then hands the products to the ScoutOS /import
 * popup with postMessage.
 *
 * Kept as plain ES2017 text (not a compiled function) so it runs as-is.
 */
const SOURCE = `
(async () => {
  const O = "__ORIGIN__";
  const u = new URL(location.href);
  const seg = u.pathname.split("/").filter(Boolean);
  const last = seg[seg.length - 1];
  const q = new URLSearchParams({ per_page: "100" });
  if (seg[0] === "producto" || seg[0] === "product") q.set("slug", last);
  else if (seg[0] === "product-category" || seg[0] === "categoria-producto") q.set("category", last);
  else if (seg[0] === "marca" || seg[0] === "brand") q.set("brand", last);
  else if (u.searchParams.get("s")) q.set("search", u.searchParams.get("s"));
  else { alert("ScoutOS: abre una categoría, una búsqueda o un producto de la tienda."); return; }

  const w = window.open(O + "/import?popup=1", "scoutos-import");
  if (!w) { alert("ScoutOS: permite las ventanas emergentes para este sitio y vuelve a intentarlo."); return; }

  let all = [];
  try {
    for (let page = 1; page <= 10; page++) {
      q.set("page", String(page));
      const r = await fetch("/wp-json/wc/store/v1/products?" + q);
      if (!r.ok) throw new Error("HTTP " + r.status);
      all = all.concat(await r.json());
      if (page >= Number(r.headers.get("x-wp-totalpages") || 1)) break;
    }
  } catch (e) {
    w.close();
    alert("ScoutOS: no se pudo leer la tienda (" + e.message + ").");
    return;
  }

  const msg = { type: "scoutos-import", url: location.href, products: all };
  addEventListener("message", (e) => {
    if (e.origin === O && e.data === "scoutos-ready") w.postMessage(msg, O);
  });
})();
`;

export function buildBookmarklet(scoutosOrigin: string): string {
  const code = SOURCE.replace("__ORIGIN__", scoutosOrigin).replace(/\s*\n\s*/g, " ").trim();
  return "javascript:" + encodeURIComponent(code);
}
