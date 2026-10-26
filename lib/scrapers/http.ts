const USER_AGENT = "ScoutOS/0.1 (rastreador personal de precios)";

/** Pause between paginated requests so we don't hammer the stores. */
export const REQUEST_DELAY_MS = 1200;

/** Upper bound on products pulled from one listing link. */
export const MAX_PRODUCTS = 500;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(
      status === 403
        ? `La tienda bloqueó la petición (403) en ${url}`
        : `HTTP ${status} en ${url}`,
    );
  }
}

export async function get(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "es-CR,es;q=0.9" },
    cache: "no-store",
  });
  // VTEX answers 206 Partial Content for paginated searches.
  if (!res.ok && res.status !== 206) throw new HttpError(res.status, url);
  return res;
}

export async function getJson<T>(url: string): Promise<{ data: T; res: Response }> {
  const res = await get(url);
  return { data: (await res.json()) as T, res };
}

export async function getText(url: string): Promise<string> {
  return (await get(url)).text();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n.toLowerCase()] ?? m);
}

export function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
