export function appendChunkWithSmartSpacing(
  prev: string,
  chunk: string
): string {
  if (!prev) return chunk;
  if (!chunk) return prev;

  // Get the last visible char from `prev` (ignoring trailing tags/space)
  const lastVisibleChar = [...prev].reverse().find((c) => /\S/.test(c)) ?? "";
  const firstChar = chunk.trimStart().charAt(0);

  const lastIsAlphaNum = /[a-zA-Z0-9]/.test(lastVisibleChar);
  const firstIsAlphaNum = /[a-zA-Z0-9]/.test(firstChar);

  const needsSpace = lastIsAlphaNum && firstIsAlphaNum;

  return prev + (needsSpace ? " " : "") + chunk;
}
