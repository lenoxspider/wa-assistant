import db from '../db/sqlite';

export function startArchiverCron() {
  console.log('Disappearing-Message Archiver cron scheduled.');
  
  // Run every hour
  setInterval(() => {
    try {
      // 7 days in seconds
      const expiryTime = (Date.now() / 1000) - (7 * 24 * 60 * 60); 
      
      const result = db.prepare(`
        UPDATE messages 
        SET body = '[Message Expired]', deleted = 1 
        WHERE isEphemeral = 1 
          AND deleted = 0 
          AND timestamp < ?
      `).run(expiryTime);

      if (result.changes > 0) {
        console.log(`Archived ${result.changes} expired ephemeral messages.`);
      }
    } catch (err) {
      console.error('Archiver cron failed:', err);
    }
  }, 60 * 60 * 1000); // 1 hour
}
