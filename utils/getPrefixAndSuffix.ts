export function getPrefixAndSuffix(paragraph: string) {
  const words = paragraph.trim().split(/\s+/);
  const prefix = words[0];
  const suffix = words[words.length - 1];
  return { prefix, suffix };
}
