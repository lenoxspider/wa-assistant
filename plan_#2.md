## Extended Feature Modules – Full Implementation Plans  

All ten features are integrated into the existing architecture with concrete deliverables, test cases, and schema changes. Where necessary, I’ve noted modifications to previously defined components.

---

### 1. Anti‑Ban / Rate‑Limiting & Slow Mode

**Goal:** Prevent WhatsApp from shadow‑banning or temporarily restricting the account by respecting per‑chat and global message‑rate limits and by simulating human typing behaviour.

**Prereqs:** Baileys client, BullMQ job queue, Redis.

**Tasks**

- **1.1 Global burst limiter** – in `src/baileys/send.ts` (or a new middleware), maintain a sliding‑window counter in Redis (key `ratelimit:global`). Allow max 50 outgoing messages per 10‑minute window. If limit is hit, reject with a logged warning and optionally notify the dashboard.
- **1.2 Per‑chat limiter** – use Redis key `ratelimit:chat:<jid>` with max 5 messages per 5 minutes (configurable). Reject messages that exceed threshold; enqueue a delayed retry instead of dropping (optional).
- **1.3 Typing delay simulator** – before each `sendMessage`, compute a random pause (1.5 s – 4 s, weighted toward longer pauses for longer messages) and `await` or use `setTimeout`. This also prevents spamming and mimics a human.
- **1.4 Typing indicator** – use Baileys’ `sendPresenceUpdate('composing')` 1 s before sending, then `sendPresenceUpdate('paused')` after delay.
- **1.5 Config** – add to `config/default.json`:
  ```json
  "ratelimit": {
    "global": { "max": 50, "windowSec": 600 },
    "perChat": { "max": 5, "windowSec": 300 },
    "typingDelay": { "min": 1500, "max": 4000 }
  }
  ```

**Deliverables**
- `src/baileys/rateLimiter.ts` (sliding‑window checks, delay helper).
- Modified `src/baileys/send.ts` to call limiter and delay.
- Redis keys defined.

**Test**

- Send 10 messages rapidly to the same chat; verify that only 5 are delivered within 5 minutes and the rest are delayed / logged.
- Monitor typing indicator and random delays; ensure message timestamps are realistic.

---

### 2. Media Handling (Images, Documents, Videos)

**Goal:** Process incoming media messages, leverage a vision model (when enabled), store the media, and surface it in the dashboard with a toggle to enable automatic vision‑based replies.

**Prereqs:** Ollama multimodal model (e.g., `llava`), Baileys media download, storage directory.

**Tasks**

- **2.1 Media download & storage** – on incoming messages with `mediaType = 'image' | 'video' | 'document'`, download the buffer (Baileys `downloadMediaMessage`), save to `data/media/<chatId>/<msgId>.<ext>`, and record the relative path in the `messages` table.
- **2.2 Vision model toggle** – add a configuration `media.useVision` (boolean) and a per‑chat override in the `rules` table (`useVision BOOLEAN DEFAULT 0`). Dashboard provides a checkbox per chat.
- **2.3 Vision pipeline** – if vision is enabled for the chat, after image/document is saved, enqueue a `visionJob` that:
  - Passes the image bytes (or file path) to Ollama’s multimodal endpoint with a prompt: “Describe this image in a single sentence that could be used to reply to the sender.”
  - The description becomes a synthetic message from the sender (`mediaType = 'image'`, `body = description`) that is fed into the normal Chat Pipeline as if the contact wrote it.
- **2.4 Dashboard notification** – regardless of vision resolution, create a “Media notification” entry in the dashboard (stored as a special event, not a message). Users can click to view the image/video in the UI.
- **2.5 UI toggle** – in Chat Settings panel, a switch “Use vision to reply to media”. Global default in settings.

**Deliverables**
- `src/pipeline/vision.ts` (download, call Ollama multimodal, synthetic message creation).
- Modified `src/api/routes/rules.ts` to update `useVision` field.
- Dashboard component `MediaNotification` in `dashboard/src/components/MediaNotification.jsx`.

**Test**
- Send a photo of a cat with vision enabled; verify the bot replies with something like “Looks like a cat!”.
- Disable vision; verify that only a dashboard notification appears, no reply.

---

### 3. Group Chat Reply Toggle

**Goal:** Provide a global and per‑chat setting to disable auto‑replies in group chats entirely or to reply only when directly mentioned.

**Prereqs:** Baileys provides `isGroup` flag and `mentions` array in group messages.

**Tasks**

- **3.1 Rule schema** – add to `rules` table: `respondInGroups BOOLEAN DEFAULT 0`, `groupReplyMode TEXT DEFAULT 'never'` (values: `never`, `mention_only`, `always`).
- **3.2 Dashboard UI** – toggle per group: “Allow auto‑reply in this group” and a dropdown “When to reply: Never / Only when mentioned / Always”.
- **3.3 Pipeline modification** – in `chatPipeline.ts`, before generating a reply, check `chat.isGroup`:
  - If `respondInGroups = 0`, skip.
  - If `groupReplyMode = 'mention_only'`, check whether the user’s JID (or bot’s) appears in the `mentions` array; if not, skip.
- **3.4 Global default** – environment variable `GROUP_REPLY_DEFAULT=mention_only` or config.

**Deliverables**
- Updated `src/pipeline/chatPipeline.ts` with group check logic.
- Updated `src/api/routes/rules.ts` to store new fields.
- Dashboard component: Group settings panel (show these toggles only for group chats).

**Test**
- Create a group with bot; send a message without mention → no reply.
- Mention bot → reply.
- Toggle “Always” → any message triggers reply.

---

### 4. Message Deduplication

**Goal:** Guarantee that the same WhatsApp message ID is never processed twice, even if Baileys delivers duplicate `upsert` events.

**Prereqs:** SQLite `messages` table with unique constraint on `messageId` (or `id` from raw event).

**Tasks**

- **4.1 Unique index** – add `UNIQUE(wa_message_id)` to `messages` table (if not already). Create a column `wa_message_id TEXT` that holds the original Baileys message key (`msg.key.id`). During ingestion, store it.
- **4.2 De‑duplication check** – in the producer (before enqueuing job), attempt an `INSERT OR IGNORE` into the `messages` table. If the insert succeeds, it’s a new message → enqueue job. If ignored (duplicate), log and skip.
- **4.3 Optional Redis bloom filter** – for high‑volume users, a Redis `BF.ADD` can quickly reject duplicates before DB hit.
- **4.4 Note** – Baileys may reuse the same message ID across different chats; thus the unique key should be composite `(wa_message_id, chat_jid)`.

**Deliverables**
- Update `src/db/migrations/003_dedup.sql` to add composite unique constraint.
- Modify `src/queue/producer.ts` to check before enqueue.

**Test**
- Simulate duplicate `message.upsert` event; verify only one row appears in `messages` and only one job is created.

---

### 5. Error Recovery & Dead‑Letter Queue

**Goal:** Ensure that failed jobs (after max retries) are captured for manual inspection and do not block the queue.

**Prereqs:** BullMQ supports `removeOnComplete`, `removeOnFail`, and a `failed` event.

**Tasks**

- **5.1 Dead‑letter storage** – create a SQLite table `dead_letters` with columns: `id INTEGER PK`, `jobId TEXT`, `queueName TEXT`, `failed_at DATETIME`, `error TEXT`, `data TEXT` (full job payload).
- **5.2 Worker failure event** – register a listener on the worker’s `failed` event: insert the failed job details into `dead_letters`. Also emit a WebSocket event `dead_letter:new` for dashboard alerts.
- **5.3 Dashboard inspection** – add a page `/dead-letters` that lists failed jobs with their payload and error. Allow “Retry” (re‑queue with fresh job ID) or “Discard”.
- **5.4 Global error boundaries** – wrap every pipeline call in try‑catch; rethrow for BullMQ to handle retry. Add a final fallback that logs to file and pushes to dead‑letter.
- **5.5 Monitoring** – optional Slack/Telegram alert via webhook on dead‑letter creation (configurable).

**Deliverables**
- `src/queue/deadLetter.ts` (storage and alert).
- `src/api/routes/deadLetters.ts` (endpoint to list, retry, discard).
- Dashboard page `DeadLetterPanel.jsx`.

**Test**
- Cause a job to fail (e.g., Ollama server off), let it retry to max, verify it appears in dead‑le Tters and that dashboard shows it.

---

### 6. Initial Knowledge‑Base Seeding

**Goal:** Provide an import pipeline that can bulk‑load text / documents, chunk them, embed them, and store in Chroma so the bot begins with your existing information.

**Prereqs:** File parser libraries (`pdf-parse`, `mammoth` for docx, `textract`), Ollama embedding endpoint.

**Tasks**

- **6.1 File‑upload endpoint** – `POST /api/knowledge/upload` that accepts a file (PDF, DOCX, TXT, Markdown). Save original to `data/knowledge/raw/`.
- **6.2 Chunking** – after extracting text, split into overlapping chunks of 500 characters with 100‑character overlap. Use a simple sentence‑based splitter.
- **6.3 Embedding & storage** – for each chunk, compute embedding via Ollama, upsert into Chroma collection `knowledge` with metadata (`source`, `chunkIndex`). Also insert a reference in SQLite `knowledgebase` table (full text, embedding ID, source).
- **6.4 Dashboard UI** – “Knowledge Base” page: upload button, list of imported documents, ability to delete/reprocess. Also a text‑area to manually add a knowledge snippet (which also gets chunked and embedded).
- **6.5 Incremental updates** – when user edits a snippet, recompute and replace the corresponding embeddings.
- **6.6 Prompt injection** – already covered; the Chat Pipeline appends relevant knowledge snippets during prompt building.

**Deliverables**
- `src/pipeline/knowledgeBase.ts` (chunker, embedder, import process).
- `src/api/routes/knowledge.ts` (upload, list, edit, delete).
- Dashboard components: `KnowledgeUpload.jsx`, `KnowledgeEditor.jsx`.

**Test**
- Upload a 3‑page PDF of your personal notes; verify that chunks appear in Chroma and that a subsequent question retrieves them.

---

### 7. Permissions & Role‑Based Access (Schema‑Only Foundation)

**Goal:** Even though the system is currently single‑user, design the database and authentication layer to support multiple users (e.g., for future dash‐board sharing) without a painful migration later.

**Prereqs:** None; changes are purely to the DB schema and a simple auth module.

**Tasks**

- **7.1 New `users` table** – columns: `id INTEGER PK`, `email TEXT UNIQUE`, `password_hash TEXT`, `role TEXT DEFAULT 'user'`, `created_at DATETIME`.
- **7.2 Add `userId` to all relevant tables** – `chats`, `rules`, `memories`, `personas`, `tasks`, `escalations`, `knowledgebase`, `briefs`. Default to `1` for the initial admin user.
- **7.3 Authentication** – implement JWT‑based login for the dashboard. `POST /api/auth/login` returns a token. Dashboard stores token and sends it in `Authorization` header.
- **7.4 Middleware** – `authRequired.js` that decodes the token and attaches `req.userId`. All API routes use this middleware (except login).
- **7.5 Scope queries** – every SQL query automatically filters by `userId = req.userId` to enforce data isolation.
- **7.6 UI** – login page, with default credentials (changeable). For now, only one user seed.
- **7.7 Future extensibility** – roles: `admin` can manage other users, see all data; `user` sees only own.

**Deliverables**
- `src/db/migrations/004_users.sql` (create users table, add userId columns).
- `src/api/middleware/auth.js` (JWT verification).
- `src/api/routes/auth.js` (login, logout).
- Updated database helpers to include `userId` in queries.

**Test**
- Create a second user row, log in as each, verify that data is isolated (different chat lists).

---

### 8. Backup & Disaster Recovery

**Goal:** Automatically back up the SQLite database and Chroma data to an external location on a schedule, with a documented restore procedure.

**Prereqs:** Access to an S3 bucket, Google Drive, or a local external drive; `rclone` or `awscli`.

**Tasks**

- **8.1 Backup script** – `scripts/backup.sh` (or Node.js cron): 
  - Copy `data/wa.db` and `data/chroma/` directory into a timestamped tar.gz.
  - Encrypt the archive using `gpg --symmetric` if sensitive.
  - Upload to cloud storage via `rclone copy` or `aws s3 cp`.
- **8.2 Scheduler** – add a `node-cron` job in `src/cron/backup.ts` that runs daily at 3 AM. Also keep a rolling local backup of last 7 days.
- **8.3 Restore documentation** – `docs/RESTORE.md` with exact commands to:
  - Stop the application.
  - Download latest backup, decrypt, extract.
  - Replace `data/wa.db` and `data/chroma/`.
  - Restart.
- **8.4 Health check** – after backup, run `sqlite3 data/wa.db "PRAGMA integrity_check;"` and assert OK.
- **8.5 Dashboard notification** – backup status (success/failure) can be displayed on a system health page.

**Deliverables**
- `scripts/backup.sh`
- `src/cron/backup.ts` (cron job)
- `docs/RESTORE.md`

**Test**
- Run backup manually; verify archive is created and uploaded. Restore onto a fresh machine and confirm bot functions.

---

### 9. Log Sanitisation

**Goal:** Prevent phone numbers, names, and other PII from appearing in plain‑text logs without hindering debugging.

**Prereqs:** Logging library (pino, winston) with custom serialisers.

**Tasks**

- **9.1 Sanitiser** – create `src/util/logSanitiser.ts` that defines patterns: phone numbers (`\b[+]\d{7,15}\b`), contact names (a configurable whitelist of your own PII) and replaces them with `[REDACTED]` or `[CONTACT_1]`.
- **9.2 Integration** – attach the sanitiser as a serialiser to pino’s `mixin` or as a transform stream before writing to file.
- **9.3 Dashboard‑exposed logs** – if you ever display logs in the dashboard, ensure they pass through the sanitiser.
- **9.4 Config** – store a JSON array of PII terms to redact in `config/redaction.json` (e.g., your own phone number, address).
- **9.5 Test** – unit test that a log entry containing “+1234567890” becomes “[REDACTED_PHONE]”.

**Deliverables**
- `src/util/logSanitiser.ts`
- Modified `src/index.js` to register sanitiser.

**Test**
- Send a message with your phone number in it; inspect the log file → number redacted.

---

### 10. Status (WhatsApp Status) Handling Toggle

**Goal:** Allow you to control whether the bot automatically marks received status updates (text/image “stories”) as seen. This respects your real‑world “read” behaviour.

**Prereqs:** Baileys emits `stories.upsert` or `status-update` events (different versions). We need to listen and optionally mark them as read using `sock.readMessages()` or `sock.sendReadReceipt`.

**Tasks**

- **10.1 Detection** – listen to Baileys event `stories.upsert` (or `messaging-history.set` with `isStatus == true`). Extract the status JID and keys.
- **10.2 Global toggle** – `config/statusReadEnabled` (default `false`) and a UI switch on the dashboard (Settings page) that calls `POST /api/settings/statusRead` with `{ enabled: true/false }`.
- **10.3 Mark as read** – if enabled, for each status update, call `sock.readMessages(msgKey)` (or equivalent). Wrap in a try‑catch to ignore errors.
- **10.4 Per‑contact exclusion** – optionally, for privacy, allow disabling status read for specific contacts. Add a `readStatus` boolean column in `rules`.
- **10.5 Dashboard** – simple toggle with label “Mark status as read automatically”. Additionally, a list of contacts with a checkbox to override the global setting.

**Deliverables**
- `src/baileys/statusHandler.ts` (listener, read function).
- `src/api/routes/settings.ts` (status read toggle endpoint).
- Dashboard component `StatusSettings.jsx`.

**Test**
- Enable toggle, have someone post a status, check from their phone that it shows as “seen”.
- Disable toggle, post another status, verify it remains unread.

---

## Schema & File‑Tree Addenda

New files/modules added to the project:

```
src/
├── baileys/
│   ├── rateLimiter.ts        # rate‑limiting & typing delay
│   └── statusHandler.ts      # status read marking
├── pipeline/
│   ├── vision.ts             # media→vision description
│   ├── knowledgeBase.ts      # knowledge ingestion & embedding
│   └── dedupCheck.ts         # (or inside queue/producer)
├── queue/
│   └── deadLetter.ts         # dead‑letter storage & alerts
├── cron/
│   └── backup.ts             # automated backup job
├── util/
│   └── logSanitiser.ts       # PII redaction
└── db/migrations/
    ├── 004_users.sql
    ├── 005_group_rules.sql
    └── 006_dedup_unique.sql
```

Upgrades to existing tables:
- `rules` → add `useVision`, `respondInGroups`, `groupReplyMode`, `readStatus`
- `messages` → add `wa_message_id UNIQUE composite(chat, msg_id)`
- All tables → add `user_id INTEGER NOT NULL DEFAULT 1`
- New tables: `users`, `dead_letters`

Dashboard new pages/components:
- Settings → Status Read Toggle, Media Vision Global Default, Group Reply Global Default
- Chat Settings → per‑chat overrides for vision, group, status
- Dead‑Letter Queue
- Knowledge Base (upload, edit)
- Backup status widget

---

All features are now fully specified. With these additions your bot will be resilient, privacy‑aware, and ready for future multi‑user expansion. Move forward by phasing them into the implementation roadmap (some, like dedup and base user schema, should be done very early; others like backup can be later).