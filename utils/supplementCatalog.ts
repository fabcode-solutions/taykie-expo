import type { ProductRequest } from "@/types/products.types";

// Supplement catalog helpers shared by the product forms, search and schedule creation.
// Presets must match the backend's (taykie-backend/src/validators/admin/products.validators.ts);
// each picker also offers "Other" so a user can type a value that isn't listed.

export const DOSAGE_UNITS = ["mg", "mcg", "g", "IU", "ml", "CFU"] as const;
export const DELIVERY_FORMS = [
  "capsule",
  "tablet",
  "softgel",
  "gummy",
  "powder",
  "liquid",
  "spray",
  "lozenge",
] as const;
export const TARGET_MARKETS = ["US", "UK", "AU"] as const;

/** Select value that means "type my own". */
export const OTHER_OPTION = "__other__";

/** Catalog market for a user's country code (the supplement catalog covers US/UK/AU). */
export function marketForCountry(country?: string | null): "US" | "UK" | "AU" | undefined {
  switch (country?.toUpperCase()) {
    case "US":
      return "US";
    case "GB":
    case "UK":
      return "UK";
    case "AU":
      return "AU";
    default:
      return undefined;
  }
}

/** Splits a stored strength like "5000 IU" into its amount and unit. */
export function parseStrength(strength?: string | null): { amount?: number; unit?: string } {
  const match = strength?.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return {};
  return { amount: Number(match[1].replace(",", ".")), unit: match[2].trim() || undefined };
}

/** "500" + nothing -> "500 mg"; leaves a strength that already has a unit ("5000 IU") alone. */
export function withUnit(strength: string | number, unit = "mg"): string {
  const text = String(strength).trim();
  return /[a-z]/i.test(text) ? text : `${text} ${unit}`;
}

/** Maps a stored value onto a picker: a preset, or "Other" with the value as custom text. */
export function toChoice(
  value: string | null | undefined,
  presets: readonly string[],
): { choice: string; custom: string } {
  if (!value) return { choice: "", custom: "" };
  const preset = presets.find((p) => p.toLowerCase() === value.toLowerCase());
  return preset ? { choice: preset, custom: "" } : { choice: OTHER_OPTION, custom: value };
}

/** The value a picker stands for: the preset chosen, or the custom text for "Other". */
export function fromChoice(choice?: string, custom?: string): string | undefined {
  const value = choice === OTHER_OPTION ? custom : choice;
  return value?.trim() || undefined;
}

interface CatalogDetails {
  strength?: string | number | null;
  strengthUnit?: string;
  brandName?: string | null;
  primaryActiveIngredient?: string | null;
  deliveryForm?: string | null;
  targetMarket?: string | null;
  category?: string | null;
  barcodeGtin?: string | null;
}

/**
 * The strength + catalog part of a product request, from the product form (or a medication
 * being scheduled). Only fields that have a value are included; the structured dose
 * (amount + unit) is sent together with the display strength ("5000 IU").
 */
export function catalogRequestFields(d: CatalogDetails): Partial<ProductRequest> {
  const out: Partial<ProductRequest> = {};
  const amount = typeof d.strength === "number" ? d.strength : parseStrength(String(d.strength ?? "")).amount;
  if (amount !== undefined && Number.isFinite(amount) && amount > 0) {
    const unit = d.strengthUnit ?? (typeof d.strength === "string" ? parseStrength(d.strength).unit : undefined) ?? "mg";
    out.strength = `${amount} ${unit}`;
    out.dosageAmount = amount;
    out.dosageUnit = unit;
  }
  if (d.brandName) out.brandName = d.brandName;
  if (d.primaryActiveIngredient) out.primaryActiveIngredient = d.primaryActiveIngredient;
  if (d.deliveryForm) out.deliveryForm = d.deliveryForm;
  if (d.targetMarket) out.targetMarket = d.targetMarket;
  if (d.category) out.category = d.category;
  if (d.barcodeGtin) out.barcodeGtin = d.barcodeGtin;
  return out;
}

interface CatalogLine {
  brand?: string | null;
  brandName?: string | null;
  strength?: string | null;
  deliveryForm?: string | null;
}

/** "Nature Made · 5000 IU · capsule" — the second line shown under a supplement's name. */
export function describeSupplement(item: CatalogLine): string {
  return [item.brandName ?? item.brand, item.strength, item.deliveryForm]
    .filter((part): part is string => !!part)
    .join(" · ");
}
