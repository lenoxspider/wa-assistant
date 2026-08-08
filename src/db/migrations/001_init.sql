CREATE TABLE IF NOT EXISTS auth_creds (
  key TEXT PRIMARY KEY,
  value BLOB
);

CREATE TABLE IF NOT EXISTS chats (
  jid TEXT PRIMARY KEY,
  name TEXT,
  isGroup BOOLEAN,
  lastActivity DATETIME
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chatId TEXT,
  senderJid TEXT,
  body TEXT,
  timestamp DATETIME,
  fromMe BOOLEAN,
  mediaType TEXT,
  mediaBufferRef TEXT,
  isEphemeral BOOLEAN,
  ephemeralExpiry DATETIME,
  deleted BOOLEAN DEFAULT 0,
  transcribedFrom TEXT
);

CREATE TABLE IF NOT EXISTS rules (
  chatId TEXT PRIMARY KEY,
  autoReplyEnabled BOOLEAN,
  triggersJson TEXT,
  silenceDuration INTEGER
);

CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chatId TEXT,
  senderJid TEXT,
  attribute TEXT,
  value TEXT,
  confidence TEXT,
  embeddingId TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personas (
  senderJid TEXT PRIMARY KEY,
  traitsJson TEXT,
  lastUpdated DATETIME
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chatId TEXT,
  description TEXT,
  dueBy DATETIME,
  assignedTo TEXT,
  confidence TEXT,
  status TEXT,
  externalSyncStatus TEXT
);

CREATE TABLE IF NOT EXISTS escalations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chatId TEXT,
  messageId TEXT,
  reason TEXT,
  timestamp DATETIME,
  resolvedBy TEXT,
  resolution TEXT
);

CREATE TABLE IF NOT EXISTS knowledgebase (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT,
  embeddingId TEXT,
  category TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_cache (
  queryHash TEXT PRIMARY KEY,
  result TEXT,
  expiry DATETIME
);

CREATE TABLE IF NOT EXISTS briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE,
  contentJson TEXT,
  sent BOOLEAN DEFAULT 0
);
