import { Dimensions } from "react-native";

export type AnchorRect = { x: number; y: number; width: number; height: number };

/**
 * Compute an anchored dropdown position with optional flip-up behavior.
 * Ensures the dropdown stays within the viewport with a margin and fits
 * to the trigger width within min/max bounds.
 */
export function computeDropdownPosition(
  anchor: AnchorRect | null | undefined,
  optionsCount: number,
  rowHeight: number = 40,
  maxHeight: number = 360,
  minWidth: number = 160,
  maxWidth: number = 360,
  margin: number = 8,
) {
  const screen = Dimensions.get("window");
  const trig = anchor ?? { x: 0, y: 0, width: minWidth, height: 0 };
  const estHeight = Math.min(optionsCount * rowHeight, maxHeight);
  const contentWidth = Math.min(Math.max(trig.width, minWidth), maxWidth);

  let top = trig.y + trig.height; // place below by default
  if (top + estHeight > screen.height - margin) {
    // not enough space below, flip up
    top = Math.max(margin, trig.y - estHeight);
  }

  const left = Math.min(Math.max(margin, trig.x), screen.width - contentWidth - margin);

  return { top, left, width: contentWidth, height: estHeight };
}
