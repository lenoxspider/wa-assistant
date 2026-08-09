import db from '../db/sqlite';

export function checkRules(chatId: string, isGroup: boolean = false, mentions: string[] = []): boolean {
  if (chatId === 'status@broadcast') return false;

  const isGroupChat = isGroup || chatId.endsWith('@g.us');

  // By default, group chats are disabled for auto-reply unless explicitly enabled
  if (isGroupChat) {
    try {
      const rule = db.prepare('SELECT autoReplyEnabled, respondInGroups, groupReplyMode FROM rules WHERE chatId = ?').get(chatId) as any;
      if (!rule) {
        console.log(`Auto-reply disabled by default for group chat: ${chatId}`);
        return false;
      }
      if (rule.autoReplyEnabled === 0 || rule.respondInGroups === 0) {
        console.log(`Auto-reply explicitly disabled for group chat: ${chatId}`);
        return false;
      }
      if (rule.groupReplyMode === 'mention_only') {
        const isMentioned = mentions.length > 0;
        if (!isMentioned) {
          console.log(`Auto-reply skipped for group ${chatId}: Bot was not mentioned`);
        }
        return isMentioned;
      }
      if (rule.groupReplyMode === 'never') {
        return false;
      }
    } catch (e) {
      console.log(`Auto-reply disabled for group chat: ${chatId}`);
      return false;
    }
  }
  
  // Check rules for direct messages (DMs)
  try {
    const rule = db.prepare('SELECT autoReplyEnabled FROM rules WHERE chatId = ?').get(chatId) as any;
    if (rule && rule.autoReplyEnabled === 0) {
      console.log(`Auto-reply disabled for direct chat: ${chatId}`);
      return false;
    }
  } catch (e) {}

  return true; // Default allow for direct messages (1-on-1 chats)
}
