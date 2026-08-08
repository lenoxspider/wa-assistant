import fs from 'fs';
import path from 'path';
import { MessageEvent } from '../baileys/events';
import { fetchChatHistory } from '../db/sqlite';
import { generateChatReply } from './llmClient';
import { sendMessage } from '../baileys/client';
import { queryMemory } from '../db/chroma';
import { extractMemories } from './extraction';
import { classifyIntent } from './classifier';
import { checkRules } from './rules';
import { handleEscalation } from './escalation';
import { extractTasks } from './tasks';
import { queryKnowledge } from './knowledge';
import { performWebSearch } from './search';
import db from '../db/sqlite';

function fetchPersona(senderJid: string) {
  try {
    const row = db.prepare('SELECT traitsJson FROM personas WHERE senderJid = ?').get(senderJid) as any;
    if (row && row.traitsJson) {
      const traits = JSON.parse(row.traitsJson);
      return traits.join(', ');
    }
  } catch(e) {}
  return "Friendly, concise, and helpful."; // default
}

export async function processMessagePipeline(msg: MessageEvent) {
  if (msg.fromMe) return; // don't reply to ourselves

  // 0. Rules check
  if (!checkRules(msg.chatId)) {
    console.log(`Auto-reply disabled for ${msg.chatId}`);
    return;
  }

  // 0.5 Intent classification
  const intent = await classifyIntent(msg.body || '');
  console.log(`Classified intent: ${intent}`);
  
  if (intent === 'ignore') {
    return;
  }

  if (intent === 'extract_memory') {
    await extractMemories(msg.chatId, `User: ${msg.body}`, msg.senderJid || '');
    // We proceed to chat to acknowledge it anyway.
  }

  if (intent === 'execute_task') {
    // Trigger task extraction
    setTimeout(() => {
      extractTasks(msg.chatId, `User: ${msg.body}`);
    }, 100);
    // Still proceed to chat to acknowledge it
  }

  // 1. Fetch history
  const history = fetchChatHistory(msg.chatId, 10);
  const historyText = history.map((m: any) => `${m.fromMe ? 'Me' : 'User'}: ${m.body}`).join('\n');

  // 1.5 Handle search_web intent
  let webContext = '';
  if (intent === 'search_web') {
    webContext = await performWebSearch(msg.body || '');
  }

  // 2. Fetch relevant memories
  const memoryResults = await queryMemory(msg.body || '', 3);
  const memoryFacts = memoryResults?.documents?.[0]?.length 
    ? memoryResults.documents[0].join('\n') 
    : "No relevant facts found.";

  // 2.5 Fetch relevant knowledge base snippets
  const kbResults = await queryKnowledge(msg.body || '', 2);
  const knowledgeSnippets = kbResults?.documents?.[0]?.length 
    ? kbResults.documents[0].join('\n') 
    : "No relevant knowledge found.";
    
  const finalKnowledge = webContext 
    ? `Web Search Results:\n${webContext}\n\nInternal KB:\n${knowledgeSnippets}` 
    : knowledgeSnippets;

  // 3. Load prompt template
  const templatePath = path.resolve(process.cwd(), 'config', 'prompts', 'main_persona.txt');
  let promptTemplate = fs.readFileSync(templatePath, 'utf8');

  // 4. Replace placeholders 
  const personaTraits = fetchPersona(msg.senderJid || '');

  const systemPrompt = promptTemplate
    .replace('{persona_traits}', personaTraits)
    .replace('{knowledge_snippets}', finalKnowledge)
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
      if (reply.startsWith('!ESCALATE')) {
        const reason = reply.replace('!ESCALATE', '').trim();
        await handleEscalation(msg.chatId, msg.messageId, reason);
      }
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
