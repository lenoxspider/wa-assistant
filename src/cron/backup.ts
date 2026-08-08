import fs from 'fs';
import path from 'path';

export function startBackupCron() {
  console.log('Daily backup cron scheduled.');
  // Run every 24 hours
  setInterval(() => {
    try {
      const dbPath = path.resolve(process.cwd(), 'data', 'wa.db');
      const backupPath = path.resolve(process.cwd(), 'data', `wa-backup-${Date.now()}.db`);
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
        console.log(`Database backup created at ${backupPath}`);
      }
    } catch(e) {
      console.error('Backup failed', e);
    }
  }, 24 * 60 * 60 * 1000);
}
