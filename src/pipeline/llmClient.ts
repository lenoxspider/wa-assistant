import axios from 'axios';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3';

export async function generateChatReply(prompt: string, model: string = DEFAULT_MODEL): Promise<string> {
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.2,
        num_predict: 512,
      }
    });
    return response.data.response.trim();
  } catch (error) {
    console.error('Ollama API error:', error);
    throw new Error('Failed to generate LLM response');
  }
}
