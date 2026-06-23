export async function generateEmbedding(text: string, model: string = 'nomic-embed-text'): Promise<number[] | null> {
  try {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: text
      })
    });
    
    if (!res.ok) {
      throw new Error('Failed to generate embedding');
    }
    
    const data = await res.json();
    return data.embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return null;
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
