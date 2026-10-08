import type OpenAI from 'openai';

export async function embedText(
  client: OpenAI,
  model: string,
  dimensions: number,
  input: string,
): Promise<number[] | null> {
  const text = input.trim();
  if (!text || !model || dimensions <= 0) {
    return null;
  }

  try {
    const response = await client.embeddings.create({
      model,
      input: text,
    });
    const vector = response.data[0]?.embedding;
    if (!vector || vector.length !== dimensions) {
      return null;
    }
    return vector;
  } catch {
    return null;
  }
}
