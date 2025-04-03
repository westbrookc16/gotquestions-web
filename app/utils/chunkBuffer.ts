export function createSmartAppender() {
  let carry = "";

  const append = (chunk: string): string => {
    carry += chunk;

    // Look for a full word or punctuation followed by space
    const match = carry.match(/^([\s\S]*?\w[\s.,!?;:]+)([\s\S]*)$/);
    if (match) {
      const flushed = match[1];
      carry = match[2];
      return flushed;
    }

    return ""; // Wait until we get a full word + punctuation or space
  };

  const flush = (): string => {
    const leftover = carry;
    carry = "";
    return leftover;
  };

  return { append, flush };
}
