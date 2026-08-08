import { generateChatReply } from './llmClient';

export type MessageIntent = 'ignore' | 'chat' | 'extract_memory' | 'execute_task' | 'search_web';

export async function classifyIntent(messageBody: string): Promise<MessageIntent> {
  const prompt = `You are a message classifier. Determine the user's intent from the following message.
Options:
- "ignore": The message is a simple acknowledgment (e.g., "ok", "thanks"), spam, or doesn't require a reply.
- "extract_memory": The user is stating a fact about themselves (e.g., "I live in Berlin", "My favorite color is blue").
- "execute_task": The user is asking you to do something outside of chatting (e.g., "remind me to...", "summarize this").
- "search_web": The user is asking a question about current events, facts, or something that requires looking up on the internet.
- "chat": A normal conversational message, question, or greeting that requires a reply.

Output ONLY the exact string from the options above. No explanation.

Message: "${messageBody}"`;

  try {
    const reply = await generateChatReply(prompt);
    const intent = reply.toLowerCase().trim();
    if (['ignore', 'extract_memory', 'execute_task', 'search_web', 'chat'].includes(intent)) {
      return intent as MessageIntent;
    }
    return 'chat'; // default fallback
  } catch (err) {
    return 'chat';
  }
}
