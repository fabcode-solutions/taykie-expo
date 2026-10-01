export interface SearchItem {
  id: string;
  name: string;
  type?: string;
  description?: string;
  strength?: string | null;
  dosage?: string | null;
  // Where this item came from — used to decide whether selecting it needs to
  // create a local product record first (api-sourced items aren't in our DB
  // yet) and what `source` to log on the supplement usage-capture event.
  source?: "local" | "api" | "custom";
  brand?: string;
  category?: string;
  doseQuantity?: string;
  // Supplement catalog fields (admin-managed products).
  brandName?: string | null;
  primaryActiveIngredient?: string | null;
  targetMarket?: string | null;
  deliveryForm?: string | null;
  // Open Food Facts barcode, present only for source: "api" items.
  offId?: string;
}
