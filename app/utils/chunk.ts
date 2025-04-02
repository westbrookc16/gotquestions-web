export function appendChunkWithSmartSpacing(prev: string, next: string) {
  if (!prev) return next;

  const needsSpace =
    !prev.endsWith(" ") &&
    !next.startsWith(" ") &&
    !next.startsWith(".") &&
    !next.startsWith(",") &&
    !next.startsWith("!") &&
    !next.startsWith("?");

  return needsSpace ? prev + " " + next : prev + next;
}
