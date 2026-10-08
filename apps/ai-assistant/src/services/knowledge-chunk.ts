export function chunkText(text: string, size = 480, overlap = 60): string[] {
  // TODO нужно очищать лучше (возможно использовать модель для этого).
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }
  if (overlap >= size) {
    throw new Error('Перекрытие чанка должно быть меньше его размера');
  }
  if (normalized.length <= size) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + size);
    const piece = normalized.slice(start, end).trim();
    if (piece) {
      chunks.push(piece);
    }
    if (end >= normalized.length) {
      break;
    }
    start = end - overlap;
  }
  return chunks;
}
