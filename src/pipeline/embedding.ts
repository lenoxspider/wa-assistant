import axios from 'axios';

const LLAMA_SERVER_URL = process.env.LLAMA_SERVER_URL || 'http://localhost:8080';

export async function embed(text: string): Promise<number[]> {
  try {
    // Try llama-server /embedding endpoint
    const response = await axios.post(`${LLAMA_SERVER_URL}/embedding`, {
      content: text
    }, { timeout: 10000 });

    if (Array.isArray(response.data)) {
      return response.data[0]?.embedding || response.data;
    }
    if (response.data?.embedding) {
      return response.data.embedding;
    }
  } catch (err) {
    try {
      // Fallback to /v1/embeddings endpoint
      const response = await axios.post(`${LLAMA_SERVER_URL}/v1/embeddings`, {
        input: text
      }, { timeout: 10000 });
      if (response.data?.data?.[0]?.embedding) {
        return response.data.data[0].embedding;
      }
    } catch (e) {}

    console.warn(`llama-server embedding unavailable at ${LLAMA_SERVER_URL}. Using empty embedding fallback.`);
    return [];
  }
  return [];
}
