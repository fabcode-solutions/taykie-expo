import { SearchItem } from "@/types/search.types";

// Open Food Facts public search API — no API key required. Restricted to
// the dietary-supplements category per the supplement search brief (Layer
// 1: live API search).
const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_TIMEOUT_MS = 8000;
// OFF throttles/503s requests with no identifying User-Agent — required by
// their API usage guidelines, and also just makes 503s far less frequent.
const OFF_USER_AGENT = "Taykie/1.0 (React Native; supplement search)";
// 503s from OFF are usually a momentary blip, not a real outage — one retry
// clears the overwhelming majority of them without the user noticing.
const OFF_MAX_ATTEMPTS = 2;
const OFF_RETRY_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface OFFProduct {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  quantity?: string;
}

interface OFFSearchResponse {
  products?: OFFProduct[];
}

/**
 * Searches Open Food Facts' dietary-supplements category and maps results
 * into the app's SearchItem shape. Items are tagged source: "api" so the
 * rest of the schedule-creation flow knows they need a local product record
 * created before use, and so the usage-capture event logs the right source.
 */
export async function searchSupplements(query: string, limit = 20): Promise<SearchItem[]> {
  const params = new URLSearchParams({
    search_terms: query,
    tagtype_0: "categories",
    tag_contains_0: "contains",
    tag_0: "dietary-supplements",
    json: "1",
    page_size: String(limit),
    fields: "code,product_name,generic_name,brands,categories,quantity",
  });

  const url = `${OFF_SEARCH_URL}?${params.toString()}`;

  let lastError: unknown;
  for (let attempt = 1; attempt <= OFF_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": OFF_USER_AGENT },
      });

      if (!response.ok) {
        // 5xx is almost always transient on OFF's end — worth a retry.
        // Anything else (4xx) won't improve by retrying.
        if (response.status >= 500 && attempt < OFF_MAX_ATTEMPTS) {
          lastError = new Error(`Open Food Facts search failed with status ${response.status}`);
          await sleep(OFF_RETRY_DELAY_MS);
          continue;
        }
        throw new Error(`Open Food Facts search failed with status ${response.status}`);
      }

      const data: OFFSearchResponse = await response.json();

      return (data.products ?? [])
        .filter((product) => product.code && (product.product_name || product.generic_name))
        .map((product): SearchItem => {
          const name = (product.product_name || product.generic_name)!.trim();
          // OFF often lists several brands comma-separated — the first is
          // the one shown on the pack front, which is what a user recognizes.
          const brand = product.brands?.split(",")[0]?.trim();

          return {
            id: `off:${product.code}`,
            name,
            description: brand,
            brand,
            category: product.categories?.split(",")[0]?.trim(),
            doseQuantity: product.quantity?.trim(),
            source: "api",
            offId: product.code,
          };
        });
    } catch (error) {
      lastError = error;
      if (attempt < OFF_MAX_ATTEMPTS) {
        await sleep(OFF_RETRY_DELAY_MS);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}
