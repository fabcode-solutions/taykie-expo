/**
 * Formats a currency value, preferring pre-formatted strings from the API
 * @param value - The numeric value to format
 * @param formatted - The pre-formatted string from the API (if available)
 * @returns A formatted currency string
 */
export const formatCurrency = (value: number | string | undefined, formatted?: string): string => {
  // Prefer the pre-formatted string from the API
  if (formatted) return formatted;

  // Handle string values (might already be formatted)
  if (typeof value === "string") {
    // Check if it's already formatted with $
    if (value.startsWith("$")) return value;
    // Try to parse and format
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return `$${parsed.toFixed(2)}`;
    return value;
  }

  // Handle numeric values
  if (typeof value === "number") {
    return `$${value.toFixed(2)}`;
  }

  // Default fallback
  return "$0.00";
};

/**
 * Formats a large number with thousand separators
 * @param value - The numeric value to format
 * @returns A formatted string with thousand separators
 */
export const formatNumber = (value: number): string => {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formats currency with thousand separators (fallback when API doesn't provide formatted strings)
 * @param value - The numeric value to format
 * @returns A formatted currency string with thousand separators
 */
export const formatCurrencyWithSeparators = (value: number): string => {
  return `$${formatNumber(value)}`;
};
