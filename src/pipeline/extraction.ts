import { generateChatReply } from './llmClient';
import db from '../db/sqlite';
import { upsertMemory } from '../db/chroma';
import crypto from 'crypto';

export async function extractMemories(chatId: string, historyText: string, senderJid: string) {
  const prompt = `You are a fact extractor. Given the following conversation, output a JSON list of new facts about the user. 
Format: [{"attribute":"location", "value":"Berlin", "confidence":"high"}]
If no new facts, return [].

Conversation:
${historyText}`;

  try {
    const reply = await generateChatReply(prompt);
    const jsonStart = reply.indexOf('[');
    const jsonEnd = reply.lastIndexOf(']') + 1;
    if (jsonStart === -1 || jsonEnd === 0) return;
    
    const facts = JSON.parse(reply.slice(jsonStart, jsonEnd));
    
    for (const fact of facts) {
      if (!fact.attribute || !fact.value) continue;
      
      const statement = `Sender's ${fact.attribute} is ${fact.value}`;
      const id = crypto.createHash('md5').update(statement + chatId).digest('hex');
      
      // Store in SQLite
      db.prepare(`
        INSERT INTO memories (chatId, senderJid, attribute, value, confidence, embeddingId)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(chatId, senderJid, fact.attribute, fact.value, fact.confidence, id);

      // Store in Chroma
      await upsertMemory(id, statement, {
        chatId,
        senderJid,
        attribute: fact.attribute
      });
      console.log(`Extracted and stored memory: ${statement}`);
    }
  } catch (error) {
    console.error('Failed to extract memory:', error);
  }
}
