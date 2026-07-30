export function chunkText(text: string, size = 1000, overlap = 100): string[] {
  const chunks: string[] = [];
  if (!text) {
    return [];
  }

  const step = Math.max(1, size - overlap);
  let i = 0;

  while (i < text.length) {
    let end = i + size;

    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > i) {
        end = lastSpace;
      }
    }

    chunks.push(text.slice(i, end).trim());
    i += step;
  }

  return chunks;
}
