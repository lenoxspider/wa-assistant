import { incomingQueue } from './connection';
import { MessageEvent } from '../baileys/events';
import db from '../db/sqlite';

export async function enqueueIncoming(msgObj: MessageEvent) {
  try {
    const existing = db.prepare('SELECT id FROM messages WHERE id = ?').get(msgObj.messageId);
    if (existing) {
      console.log(`Duplicate message ignored: ${msgObj.messageId}`);
      return;
    }

    db.prepare(`
      INSERT INTO messages (id, chatId, senderJid, body, timestamp, fromMe, mediaType, isEphemeral, ephemeralExpiry)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      msgObj.messageId,
      msgObj.chatId,
      msgObj.senderJid,
      msgObj.body,
      msgObj.timestamp,
      msgObj.fromMe ? 1 : 0,
      msgObj.mediaType,
      msgObj.isEphemeral ? 1 : 0,
      msgObj.ephemeralExpiry
    );

    await incomingQueue.add('process-message', msgObj, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
    console.log(`Enqueued message ${msgObj.messageId}`);
  } catch (error) {
    console.error('Failed to enqueue message:', error);
  }
}
