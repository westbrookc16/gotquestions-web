export function appendChunkWithSmartSpacing(
  prev: string,
  chunk: string
): string {
  if (!prev) return chunk;
  if (!chunk) return prev;

  const prevEndsWithLetter = /[a-zA-Z]$/.test(prev);
  const chunkStartsWithLetter = /^[a-zA-Z]/.test(chunk);

  const needsSpace = prevEndsWithLetter && chunkStartsWithLetter;

  return prev + (needsSpace ? " " : "") + chunk;
}
