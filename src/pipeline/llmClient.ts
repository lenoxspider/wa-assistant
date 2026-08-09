import axios from 'axios';

const LLAMA_SERVER_URL = process.env.LLAMA_SERVER_URL || 'http://localhost:8080';

export async function generateChatReply(prompt: string): Promise<string> {
  try {
    // 1. Try llama-server native /completion endpoint
    const response = await axios.post(`${LLAMA_SERVER_URL}/completion`, {
      prompt,
      temperature: 0.2,
      n_predict: 512,
      stop: ["User:", "Human:", "System:"]
    }, { timeout: 30000 });

    if (response.data && response.data.content) {
      return response.data.content.trim();
    }
  } catch (error: any) {
    // 2. Fallback to OpenAI-compatible /v1/chat/completions endpoint
    try {
      const response = await axios.post(`${LLAMA_SERVER_URL}/v1/chat/completions`, {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 512
      }, { timeout: 30000 });
      
      const choice = response.data?.choices?.[0];
      if (choice?.message?.content) {
        return choice.message.content.trim();
      }
    } catch (e: any) {
      console.warn(`llama-server API unavailable at ${LLAMA_SERVER_URL} (${error.message}). Using fallback response.`);
    }

    if (prompt.includes('You are a message classifier')) {
      return 'chat';
    }
    return `Hello! Thanks for your message. How can I help you today?`;
  }

  return `Hello! Thanks for your message. How can I help you today?`;
}
