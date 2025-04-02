export function appendChunkWithSmartSpacing(
  prev: string,
  chunk: string
): string {
  if (!prev) return chunk;
  if (!chunk) return prev;

  const lastChar = prev.trim().slice(-1);
  const firstChar = chunk.trim().charAt(0);

  const prevEndsWithLetter = /[a-zA-Z0-9]/.test(lastChar);
  const chunkStartsWithLetter = /[a-zA-Z0-9]/.test(firstChar);

  const needsSpace = prevEndsWithLetter && chunkStartsWithLetter;

  return prev + (needsSpace ? " " : "") + chunk;
}
