export function appendChunkWithSmartSpacing(
  prev: string,
  chunk: string
): string {
  if (!prev || !chunk) return prev + chunk;

  const prevEndsWithLetter = /[a-zA-Z]$/.test(prev);
  const chunkStartsWithLetter = /^[a-zA-Z]/.test(chunk);

  const needsSpace = prevEndsWithLetter && chunkStartsWithLetter;

  return prev + (needsSpace ? " " : "") + chunk;
}
