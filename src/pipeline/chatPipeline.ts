import fs from 'fs';
import path from 'path';
import { MessageEvent } from '../baileys/events';
import { fetchChatHistory } from '../db/sqlite';
import { generateChatReply } from './llmClient';
import { sendMessage } from '../baileys/client';
import { queryMemory } from '../db/chroma';
import { extractMemories } from './extraction';

export async function processMessagePipeline(msg: MessageEvent) {
  if (msg.fromMe) return; // don't reply to ourselves

  // 1. Fetch history
  const history = fetchChatHistory(msg.chatId, 10);
  const historyText = history.map((m: any) => `${m.fromMe ? 'Me' : 'User'}: ${m.body}`).join('\n');

  // 2. Fetch relevant memories
  const memoryResults = await queryMemory(msg.body || '', 3);
  const memoryFacts = memoryResults?.documents?.[0]?.length 
    ? memoryResults.documents[0].join('\n') 
    : "No relevant facts found.";

  // 3. Load prompt template
  const templatePath = path.resolve(process.cwd(), 'config', 'prompts', 'main_persona.txt');
  let promptTemplate = fs.readFileSync(templatePath, 'utf8');

  // 4. Replace placeholders (mocking persona until Phase 3)
  const personaTraits = "Friendly, concise, and helpful.";
  const knowledgeSnippets = "No relevant knowledge found.";

  const systemPrompt = promptTemplate
    .replace('{persona_traits}', personaTraits)
    .replace('{knowledge_snippets}', knowledgeSnippets)
    .replace('{memory_facts}', memoryFacts);

  const fullPrompt = `${systemPrompt}

Conversation history:
${historyText}

User message: ${msg.body}
`;

  console.log('Sending prompt to Ollama...');
  
  try {
    const reply = await generateChatReply(fullPrompt);
    
    if (reply.startsWith('!ESCALATE') || reply.startsWith('!NO_REPLY')) {
      console.log('LLM requested escalation or no reply:', reply);
      return;
    }

    console.log('Sending reply:', reply);
    await sendMessage(msg.chatId, { text: reply });

    // 5. Trigger background memory extraction after sending reply
    setTimeout(() => {
      extractMemories(msg.chatId, historyText + `\nMe: ${reply}`, msg.senderJid || '');
    }, 100);

  } catch (err) {
    console.error('Error in chat pipeline:', err);
  }
}
