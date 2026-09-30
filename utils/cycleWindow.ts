/**
 * The `slot`-th window of `count` items from `list`, wrapping around the end.
 *
 * Used when the same kind of block appears several times in a feed (e.g. group
 * suggestions after posts 4, 14, 24…): each block shows the NEXT set of items instead
 * of repeating the first ones. With fewer than `count` items, every slot gets them all.
 */
export function cycleWindow<T>(list: readonly T[], slot: number, count: number): T[] {
  if (list.length === 0 || count <= 0) return [];
  if (list.length <= count) return [...list];
  const start = (slot * count) % list.length;
  return Array.from({ length: count }, (_, i) => list[(start + i) % list.length]);
}
