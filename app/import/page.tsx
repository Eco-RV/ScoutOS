import ImportReceiver from "@/components/ImportReceiver";
import { STORES } from "@/lib/scrapers";

export default function ImportPage() {
  const browserOnly = STORES.filter((s) => s.browserOnly);
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar desde tu navegador</h1>
        <p className="mt-1 text-sm text-muted">
          {browserOnly.map((s) => s.name).join(", ")} bloquea las peticiones automáticas, así que ScoutOS no puede
          revisarla solo. Con este marcador la importas tú mientras navegas la tienda.
        </p>
      </div>

      <ImportReceiver allowedHosts={browserOnly.flatMap((s) => s.hosts)} />

      <ol className="list-decimal space-y-1.5 pl-5 text-sm">
        <li>Arrastra el botón <strong>Importar a ScoutOS</strong> a tu barra de marcadores (solo la primera vez).</li>
        <li>
          Abre en la tienda una categoría, una búsqueda o un producto, por ejemplo{" "}
          <a
            href="https://extremetechcr.com/product-category/computadoras/laptops/laptops-laptops/"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline"
          >
            Laptops de ExtremeTech
          </a>
          .
        </li>
        <li>Pulsa el marcador. Se abre una ventana de ScoutOS que guarda las laptops y te dice cuántas bajaron de precio.</li>
        <li>Repite cuando quieras actualizar los precios: el historial y las rebajas funcionan igual que en las demás tiendas.</li>
      </ol>
      <p className="text-xs text-muted">
        ScoutOS tiene que estar abierto (npm run dev) en esta misma dirección cuando uses el marcador.
      </p>
    </div>
  );
}
