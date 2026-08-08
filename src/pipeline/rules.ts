import db from '../db/sqlite';

export function checkRules(chatId: string): boolean {
  try {
    const rule = db.prepare('SELECT autoReplyEnabled, silenceDuration FROM rules WHERE chatId = ?').get(chatId) as { autoReplyEnabled: number, silenceDuration: number } | undefined;
    
    if (rule) {
      if (rule.autoReplyEnabled === 0) return false;
      // Future: check silenceDuration timestamp
    }
  } catch (e) {
    console.error('Rule engine error:', e);
  }
  return true; // Default allow
}
