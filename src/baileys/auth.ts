import db from '../db/sqlite';
import { initAuthCreds, BufferJSON, AuthenticationCreds } from '@whiskeysockets/baileys';

export const useSQLiteAuthState = () => {
  // Ensure the auth_creds table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_creds (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  const readData = (key: string) => {
    try {
      const row = db.prepare('SELECT value FROM auth_creds WHERE key = ?').get(key) as { value: string } | undefined;
      if (row) {
        return JSON.parse(row.value, BufferJSON.reviver);
      }
    } catch (error) {
      console.error(`Error reading ${key} from SQLite auth:`, error);
    }
    return null;
  };

  const writeData = (data: any, key: string) => {
    try {
      const value = JSON.stringify(data, BufferJSON.replacer);
      db.prepare('INSERT OR REPLACE INTO auth_creds (key, value) VALUES (?, ?)').run(key, value);
    } catch (error) {
      console.error(`Error writing ${key} to SQLite auth:`, error);
    }
  };

  const removeData = (key: string) => {
    try {
      db.prepare('DELETE FROM auth_creds WHERE key = ?').run(key);
    } catch (error) {
      console.error(`Error removing ${key} from SQLite auth:`, error);
    }
  };

  let creds: AuthenticationCreds = readData('creds') || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: (type: string, ids: string[]) => {
          const data: { [key: string]: any } = {};
          for (const id of ids) {
            let value = readData(`${type}-${id}`);
            if (type === 'app-state-sync-key' && value) {
              value = { ...value, syncKey: Buffer.from(value.syncKey) };
            }
            data[id] = value;
          }
          return data;
        },
        set: (data: any) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              if (value) {
                writeData(value, key);
              } else {
                removeData(key);
              }
            }
          }
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds'),
  };
};
