import db from '../db/sqlite';
import { sendMessage } from '../baileys/client';
import { emitEscalation } from '../api/server';
import { scheduleAutoRelease } from '../queue/producer';

export async function handleEscalation(chatId: string, messageId: string, reasonText: string) {
  const reason = reasonText || 'User requires human assistance';
  
  try {
    // Record escalation
    const result = db.prepare(`
      INSERT INTO escalations (chatId, messageId, reason, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(chatId, messageId, reason, Date.now());

    const escalationId = Number(result.lastInsertRowid);

    // Disable auto-reply for the chat while escalated
    db.prepare('INSERT OR REPLACE INTO rules (chatId, autoReplyEnabled, silenceDuration) VALUES (?, ?, ?)').run(chatId, 0, 0);

    // Notify dashboard via WebSockets
    emitEscalation({ id: escalationId, chatId, messageId, reason, timestamp: Date.now() });

    // Schedule auto-release timer (default 2 hours, or via AUTO_RELEASE_DELAY_MS env)
    const delayMs = parseInt(process.env.AUTO_RELEASE_DELAY_MS || '7200000', 10);
    await scheduleAutoRelease(escalationId, chatId, delayMs);

    // Send deferral reply
    await sendMessage(chatId, { text: "I'm passing this over to a human who can help you better. They'll be with you shortly!" });
  } catch (error) {
    console.error('Failed to handle escalation:', error);
  }
}
