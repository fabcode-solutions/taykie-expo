/**
 * Converts a hex color string to an RGB color string
 * @param hex - The hex color string (e.g., "#f8f9fa" or "f8f9fa")
 * @returns The RGB color string (e.g., "rgb(248, 249, 250)")
 */
export function hexToRgb(hex: string): string {
  // Remove the hash if it exists
  const cleanHex = hex.replace("#", "");

  // Parse the hex values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Converts a hex color string to an RGBA color string
 * @param hex - The hex color string (e.g., "#f8f9fa" or "f8f9fa")
 * @param alpha - The alpha value (0-1)
 * @returns The RGBA color string (e.g., "rgba(248, 249, 250, 0.5)")
 */
export function hexToRgba(hex: string, alpha: number): string {
  // Remove the hash if it exists
  const cleanHex = hex.replace("#", "");

  // Parse the hex values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
