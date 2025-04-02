export function appendChunkWithSmartSpacing(
  prev: string,
  chunk: string
): string {
  if (!prev) return chunk;
  if (!chunk) return prev;

  const trimmedChunk = chunk.trimStart();

  const lastChar = prev.slice(-1);
  const firstChar = trimmedChunk.charAt(0);

  const hasTrailingSpace = lastChar === " ";
  const hasLeadingSpace = chunk.charAt(0) === " ";

  // Rules for when to add a space
  const shouldAddSpace =
    // e.g. "word" + "next"
    (/[a-zA-Z0-9]/.test(lastChar) && /[a-zA-Z0-9]/.test(firstChar)) ||
    // e.g. "." + "Next"
    (/[.?!]/.test(lastChar) && /[A-Z]/.test(firstChar));

  const spacer =
    !hasTrailingSpace && !hasLeadingSpace && shouldAddSpace ? " " : "";

  return prev + spacer + chunk;
}
