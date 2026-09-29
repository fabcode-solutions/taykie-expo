import { SearchItem } from "@/types/search.types";

// Open Food Facts public search API — no API key required. Restricted to
// the dietary-supplements category per the supplement search brief (Layer
// 1: live API search).
const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_TIMEOUT_MS = 8000;

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);

  try {
    const response = await fetch(`${OFF_SEARCH_URL}?${params.toString()}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Open Food Facts search failed with status ${response.status}`);
    }

    const data: OFFSearchResponse = await response.json();

    return (data.products ?? [])
      .filter((product) => product.code && (product.product_name || product.generic_name))
      .map((product): SearchItem => {
        const name = (product.product_name || product.generic_name)!.trim();
        // OFF often lists several brands comma-separated — the first is the
        // one shown on the pack front, which is what a user recognizes.
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
  } finally {
    clearTimeout(timeout);
  }
}
