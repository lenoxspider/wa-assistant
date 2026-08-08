import { generateChatReply } from './llmClient';
import db from '../db/sqlite';

export async function extractTasks(chatId: string, historyText: string) {
  const prompt = `You are a task extractor. Given the following conversation, output a JSON list of tasks or action items that the user wants to accomplish or asks you to remember.
Format: [{"description":"Buy milk", "dueBy":"2026-08-10T12:00:00Z"}]
If no new tasks, return [].

Conversation:
${historyText}`;

  try {
    const reply = await generateChatReply(prompt);
    const jsonStart = reply.indexOf('[');
    const jsonEnd = reply.lastIndexOf(']') + 1;
    if (jsonStart === -1 || jsonEnd === 0) return;
    
    const tasks = JSON.parse(reply.slice(jsonStart, jsonEnd));
    
    for (const task of tasks) {
      if (!task.description) continue;
      
      db.prepare(`
        INSERT INTO tasks (chatId, description, dueBy, status, externalSyncStatus)
        VALUES (?, ?, ?, 'pending', 'pending')
      `).run(chatId, task.description, task.dueBy || null);
      
      console.log(`Extracted task: ${task.description}`);
    }
  } catch (error) {
    console.error('Failed to extract tasks:', error);
  }
}
