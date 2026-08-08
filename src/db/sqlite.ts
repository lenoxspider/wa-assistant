import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'wa.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

export function runMigrations() {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir).sort();
  
  // Create a simple migrations table to track state
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      executedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const executed = db.prepare('SELECT filename FROM _migrations').all() as {filename: string}[];
  const executedSet = new Set(executed.map(e => e.filename));

  for (const file of files) {
    if (file.endsWith('.sql') && !executedSet.has(file)) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
    }
  }
}

export default db;
