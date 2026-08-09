import axios from 'axios';

const LLAMA_SERVER_URL = process.env.LLAMA_SERVER_URL || 'http://localhost:8080';

export async function generateChatReply(systemPrompt: string, userMessage: string = ''): Promise<string> {
  try {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    if (userMessage) messages.push({ role: 'user', content: userMessage });
    else if (!systemPrompt && !userMessage) return ''; // Edge case protection

    const response = await axios.post(`${LLAMA_SERVER_URL}/v1/chat/completions`, {
      messages,
      temperature: 0.2,
      max_tokens: 512
    }, { timeout: 30000 });
    
    const choice = response.data?.choices?.[0];
    if (choice?.message?.content) {
      return choice.message.content.trim();
    }
  } catch (error: any) {
    console.warn(`llama-server API unavailable at ${LLAMA_SERVER_URL} (${error.message}). Using fallback response.`);
    
    if (systemPrompt.includes('You are a message classifier')) {
      return 'chat';
    }
    return `Hello! Thanks for your message. How can I help you today?`;
  }

  return `Hello! Thanks for your message. How can I help you today?`;
}
