import db from '../db/sqlite';
import { sendMessage } from '../baileys/client';
import { emitEscalation } from '../api/server';

export async function handleEscalation(chatId: string, messageId: string, reasonText: string) {
  const reason = reasonText || 'User requires human assistance';
  
  try {
    // Record escalation
    db.prepare(`
      INSERT INTO escalations (chatId, messageId, reason, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(chatId, messageId, reason, Date.now());

    // Disable auto-reply
    db.prepare('INSERT OR REPLACE INTO rules (chatId, autoReplyEnabled, silenceDuration) VALUES (?, ?, ?)').run(chatId, 0, 0);

    // Notify dashboard
    emitEscalation({ chatId, messageId, reason, timestamp: Date.now() });

    // Deferral reply
    await sendMessage(chatId, { text: "I'm passing this over to a human who can help you better. They'll be with you shortly!" });
  } catch (error) {
    console.error('Failed to handle escalation:', error);
  }
}
