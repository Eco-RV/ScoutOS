# ScoutOS

Rastreador de precios de laptops en tiendas de Costa Rica. Pegas el link de una laptop o de una categoría/búsqueda; ScoutOS extrae las laptops con sus especificaciones y precios, y en cada actualización guarda el historial y marca las rebajas.

## Tiendas soportadas

| Tienda | Plataforma | Cómo se extrae |
|---|---|---|
| cr.siman.com, walmart.co.cr | VTEX | API pública de catálogo |
| tiendahp.co.cr | Magento | HTML (cheerio) |
| zentechcr.net, extremeoutletcr.com | WooCommerce | Store API pública |
| extremetechcr.com | WooCommerce | Protegida por Cloudflare (403 a peticiones automáticas): se importa con el marcador de `/import` |

Links válidos, por ejemplo:

- `https://cr.siman.com/tecnologia/computadoras/laptops`
- `https://www.walmart.co.cr/electronica/computacion/laptops`
- `https://www.tiendahp.co.cr/laptops`
- `https://zentechcr.net/categoria-producto/laptops-usadas/`
- `https://extremeoutletcr.com/?s=laptop`
- Cualquier página de producto de esas tiendas

## Uso

```bash
cp .env.example .env
npm install
npx prisma migrate dev   # crea prisma/dev.db
npm run dev              # http://localhost:3000
```

Actualización automática de precios (cada 6 h por defecto, cambia con `SCRAPE_CRON`):

```bash
npm run worker           # deja corriendo el programador
npm run scrape:now       # actualiza una vez ya y sigue con el horario
```

### ExtremeTech (marcador)

ExtremeTech bloquea cualquier petición automática, así que no se actualiza sola. En `http://localhost:3000/import` hay un botón **Importar a ScoutOS**:

1. Arrástralo a la barra de marcadores.
2. Abre en la tienda una categoría, búsqueda o producto (por ejemplo `/product-category/computadoras/laptops/laptops-laptops/`).
3. Pulsa el marcador: lee los productos con tu sesión normal del navegador y los envía a ScoutOS, que guarda historial y rebajas igual que con las demás tiendas.

ScoutOS debe estar corriendo en la misma dirección donde copiaste el marcador. Permite las ventanas emergentes de extremetechcr.com si el navegador las bloquea.

Otros:

```bash
npm test                                   # tests del parser y del filtro de laptops
npx tsx scripts/try-scrape.ts <url> ...    # prueba un link sin guardar nada
```

## Cómo funciona

- `lib/scrapers/` — un adaptador por plataforma; `index.ts` elige la tienda por dominio y filtra lo que no es laptop.
- `lib/specs/parse.ts` — extrae CPU, RAM, almacenamiento, pantalla y GPU del título y la tabla de especificaciones (solo reglas, sin IA).
- `lib/ingest.ts` — guarda productos; si el precio cambió agrega una fila a `PriceHistory` y guarda el precio anterior para mostrar "Bajó ₡…".
- Rebaja = el precio actual es menor que el precio de lista de la tienda, o menor que el de la revisión anterior.

Las peticiones se hacen con pausas entre páginas y un User-Agent identificable. Es para uso personal: revisa los términos de cada tienda.
