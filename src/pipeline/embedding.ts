import axios from 'axios';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text'; 

export async function embed(text: string): Promise<number[]> {
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/embeddings`, {
      model: EMBED_MODEL,
      prompt: text
    });
    return response.data.embedding;
  } catch (err) {
    console.error('Failed to get embedding:', err);
    return [];
  }
}
