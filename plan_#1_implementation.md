## Implementation Blueprint – Component‑by‑Component  

Below is a step‑wise plan you can copy‑paste into a project plan, ticket system, or personal notebook. Each component lists **prerequisites**, **sub‑tasks**, **key files**, **libraries**, **testing checkpoints**, and **handoff notes**. No source code is included – only the concrete actions required to build the system from scratch.

---

### 1. WhatsApp Client (Baileys)

| Goal | Build a resilient, multi‑device Baileys socket that can receive and send messages, persist auth state, and expose a clean event API. |
|------|-----------------------------------------------------------------------------------------------------------------------------------|
| Prereqs | `node >=18`, `npm`, SQLite file for auth storage. |
| Tasks |
- **1.1 Install & initialise** – `npm i @whiskeysockets/baileys better-sqlite3`. |
- **1.2 Auth persistence** – create `src/baileys/auth.ts` that reads/writes a JSON blob to a SQLite table `auth_creds (key TEXT PRIMARY KEY, value BLOB)`. On start, load the blob and pass to `makeWASocket`. |
- **1.3 Socket wrapper** – `client.ts` should export: <br>• `init()` (creates socket, registers listeners) <br>• `sendMessage(jid, content)` (handles text, media, quoted messages) <br>• `close()` (graceful shutdown). |
- **1.4 Event forwarding** – listen to `messages.upsert`, `messages.update`, `messages.delete`, `group-participants.update`. Normalise each event to a plain JS object and emit via an internal `EventEmitter` (`whatsapp:incoming`). |
- **1.5 Auto‑reconnect** – on socket `close` or `disconnect`, back‑off (2 s → 4 s → 8 s) and re‑initialise. Persist any new auth credentials after reconnection. |
- **1.6 Disappearing‑message capture** – when `isEphemeral` flag appears, store `ephemeralExpiry` (timestamp) in the `messages` table. |
- **1.7 Logging** – use `pino` with level `info` for connection events, `debug` for raw stanzas (toggle via env). |
| Deliverables |
- `src/baileys/client.ts` (socket wrapper) <br> - `src/baileys/auth.ts` (SQLite auth store) <br> - `src/baileys/events.ts` (EventEmitter) |
| Test |
- Run the client, scan QR, verify that a “Hello” message sent from another phone appears in console. <br> - Simulate a network drop; ensure reconnection occurs automatically. <br> - Send a disappearing‑message (24 h); verify `ephemeralExpiry` is stored. |

---

### 2. Queue Layer (BullMQ + Redis)

| Goal | Decouple inbound WhatsApp events from heavy processing, guarantee at‑least‑once delivery, enable retries. |
|------|--------------------------------------------------------------------------------------------------------|
| Prereqs | Redis running locally (`redis-server`) or Docker. |
| Tasks |
- **2.1 Install** – `npm i bullmq ioredis`. |
- **2.2 Connection module** – `src/queue/connection.ts` creates a singleton `new Queue('incoming', { connection: new IORedis(process.env.REDIS_URL) })`. Export both `Queue` and `QueueScheduler`. |
- **2.3 Producer** – in `src/queue/producer.ts` expose `enqueueIncoming(msgObj)` that adds a job with `{ attempts: 5, backoff: { type: 'exponential', delay: 2000 } }`. |
- **2.4 Workers** – `src/queue/worker.ts` creates a `Worker('incoming', async job => { await processMessage(job.data); })`. Register separate workers for `voice-jobs`, `extraction-jobs`, `search-jobs`. |
- **2.5 Graceful shutdown** – on SIGINT, call `worker.close()`, `queueScheduler.close()`, `queue.close()`. |
| Deliverables |
- `src/queue/connection.ts` <br> - `src/queue/producer.ts` <br> - `src/queue/worker.ts` (main message worker) |
| Test |
- Push a dummy job via producer, verify worker logs payload. <br> - Crash the worker mid‑job; ensure job is retried up to 5 times. |

---

### 3. SQLite Persistence Layer

| Goal | Centralised storage for chats, rules, memories, tasks, escalations, knowledge base, and auth. |
|------|------------------------------------------------------------------------------------------------|
| Prereqs | `better-sqlite3` installed. |
| Tasks |
- **3.1 Initialise DB** – `src/db/sqlite.ts` opens `process.env.DATABASE_PATH || './data/wa.db'`. |
- **3.2 Migration scripts** – create `src/db/migrations/001_init.sql` with all tables (see “Data Architecture” below). Write a tiny migration runner that executes any missing scripts on startup. |
- **3.3 Helper wrapper** – expose functions: `insertMessage()`, `fetchChatHistory(chatId, limit)`, `upsertRule(chatId, ruleObj)`, `storeMemory()`, `fetchMemoriesForSender(senderJid, k)`, `storeTask()`, `listEscalations()`, etc. |
- **3.4 FTS (optional)** – enable SQLite full‑text search on `messages.body` for dashboard search bar. |
| Deliverables |
- `src/db/sqlite.ts` (singleton DB) <br> - `src/db/migrations/*.sql` (schema) |
| Test |
- Run migration, open DB with a SQLite client, verify tables exist. <br> - Insert a message, query back with `fetchChatHistory`. |

---

### 4. Vector Store (ChromaDB)

| Goal | Store semantic embeddings of memories and knowledge‑base entries; provide fast similarity lookup. |
|------|-----------------------------------------------------------------------------------------------|
| Prereqs | Docker or binary for Chroma (`chromadb run`). |
| Tasks |
- **4.1 Deploy** – `docker run -p 8000:8000 chromadb/chroma` (or start via `chromadb` CLI). |
- **4.2 Client wrapper** – `src/db/chroma.ts` using `axios` or `fetch` to call `/api/v1/collections`. Create two collections: `memories` and `knowledge`. |
- **4.3 Embedding function** – call Ollama’s embedding endpoint (`POST /api/embeddings`) with text, receive vector. Wrap as `embed(text): number[]`. |
- **4.4 Upsert helper** – `upsertMemory(id, text, metadata)` stores both vector and metadata (chatId, senderJid, attribute, value). |
- **4.5 Query helper** – `queryMemory(query, k)` returns top‑k IDs + metadata. |
| Deliverables |
- `src/db/chroma.ts` (collection init, upsert, query). |
| Test |
- Insert a dummy memory, query with a similar phrase, verify the same ID is returned. |

---

### 5. Multi‑Model Chauffeur (Intent Classifier)

| Goal | Decide which LLM (or tool) should handle a given incoming message. |
|------|-------------------------------------------------------------------|
| Prereqs | A tiny Ollama model (`phi`, `gemma`) that runs fast. |
| Tasks |
- **5.1 Prompt template** – store in `config/prompts/classifier.txt`. Example: “Classify the following message into one of these intents … Output JSON”. |
- **5.2 Wrapper** – `src/pipeline/classifier.ts` reads the template, injects `message.body`, calls Ollama `/api/chat` with `stream:false`. |
- **5.3 Mapping table** – create an enum: `{ QUESTION, STATEMENT, REQUEST_FOR_ME, EMOTIONAL, TASK_PROMISE, NEEDS_SEARCH, NEEDS_VOICE, ESCALATE }`. |
- **5.4 Routing logic** – after classification, switch to the appropriate handler: <br>• `main_persona` → `chatPipeline` <br>• `search` → `searchPipeline` <br>• `escalation` → `escalationHandler` <br>• `voice` → `voicePipeline`. |
| Deliverables |
- `src/pipeline/classifier.ts` (returns intent JSON). |
| Test |
- Feed a set of sample messages (e.g., “What’s the weather?”, “Can you call me?”, “I’ll send the report tomorrow”) and verify correct intent mapping. |

---

### 6. Chat Pipeline (Core Reply Generator)

| Goal | Build the prompt, call the designated LLM, handle the response, and send a reply if appropriate. |
|------|------------------------------------------------------------------------------------------------|
| Prereqs | Ollama model for general chat (`llama3`, `gemma2`), system‑prompt files. |
| Tasks |
- **6.1 Prompt assembly** – `src/pipeline/chatPipeline.ts` loads the system prompt based on routing target (`config/prompts/main_persona.txt`, `business.txt`, etc.). Append sections: persona summary, recent memory facts, recent conversation snippet, current message. |
- **6.2 LLM call** – POST to Ollama `/api/chat` with `temperature:0.2`, `max_tokens: 512`. |
- **6.3 Response parsing** – if output begins with `!ESCALATE` → forward to escalation module; if `!NO_REPLY` → drop; otherwise treat as reply text. |
- **6.4 Send reply** – use Baileys `sendMessage(chatId, { text: reply })`. Store outgoing message in SQLite (`fromMe = 1`). |
- **6.5 Persona update trigger** – after every N messages (configurable, e.g., 50), fire a background job to recompute the persona card (see Persona Mirroring). |
| Deliverables |
- `src/pipeline/chatPipeline.ts` (prompt building, LLM call, reply handling). |
| Test |
- Mock a message, run through pipeline, verify reply is sent and stored. <br> - Force an `!ESCALATE` response, verify escalation record is created. |

---

### 7. Persona Mirroring

| Goal | Keep a concise, per‑contact style summary that the LLM can inject into prompts. |
|------|-----------------------------------------------------------------------------------|
| Prereqs | Access to the main LLM, SQLite `personas` table. |
| Tasks |
- **7.1 Trigger** – after every 50 messages from a given `senderJid`, enqueue a `personaRefresh` job. |
- **7.2 Prompt** – system: “Summarise the last 200 messages from this contact into a 2‑sentence persona description, focusing on tone, slang, formality, recurring topics.” |
- **7.3 Store** – update `personas` table (`senderJid`, `traitsJson`, `lastUpdated`). |
- **7.4 Retrieval** – `chatPipeline` fetches the persona record and injects into the system prompt (`Persona: {traits}`). |
| Deliverables |
- `src/pipeline/persona.ts` (refresh job, DB update). |
| Test |
- Simulate 50 messages from a dummy contact, run refresh, check that `personas` row contains a short JSON string. |

---

### 8. Memory Extraction & Storage

| Goal | Pull factual statements from conversations, persist them, and make them searchable. |
|------|------------------------------------------------------------------------------------|
| Prereqs | Extraction LLM (small, cheap model). |
| Tasks |
- **8.1 Extraction job** – after each outgoing reply, enqueue `extractMemory` job with the last 10 messages. |
- **8.2 Prompt** – “Extract any new factual statements about the other person. Output JSON array with fields attribute, value, confidence.” |
- **8.3 Parse output** – validate JSON, discard empty arrays. |
- **8.4 Store** – for each fact: <br>• Insert into `memories` table. <br>• Compute embedding via Ollama, upsert into Chroma (`memories` collection). |
| Deliverables |
- `src/pipeline/extraction.ts` (LLM call, DB + Chroma upsert). |
| Test |
- Feed a conversation that includes “I moved to Berlin.”, run extraction, verify a memory row with attribute=location, value=Berlin. |

---

### 9. Task Extraction & Integration

| Goal | Detect commitments / to‑dos, turn them into actionable tasks, optionally sync to external task services. |
|------|------------------------------------------------------------------------------------------|
| Prereqs | Same extraction LLM, optional Todoist / Notion API keys. |
| Tasks |
- **9.1 Extraction prompt** – “Identify any tasks or promises. Return JSON with description, due date (if any), assignee (me/contact).” |
- **9.2 Run after each reply (same job as memory extraction). |
- **9.3 Store** – insert into `tasks` table (`description`, `dueBy`, `assignedTo`, `status='pending'`). |
- **9.4 Sync** – if `process.env.TODOIST_TOKEN` present, call Todoist API to create a task; store external ID. |
- **9.5 Dashboard UI** – list pending tasks, allow confirm/dismiss. |
| Deliverables |
- `src/pipeline/tasks.ts` (extraction, DB insert, optional sync). |
| Test |
- Send “I’ll send the report by Friday.”, run extraction, verify a task row with dueBy=next Friday. |

---

### 10. Search Pipeline (Live Web Lookup)

| Goal | Provide up‑to‑date factual answers for queries not covered by personal knowledge. |
|------|-----------------------------------------------------------------------------------|
| Prereqs | DuckDuckGo Instant Answers API (no key) or local SearXNG instance. |
| Tasks |
- **10.1 Trigger** – classifier returns `needs_search` *or* LLM emits `!SEARCH:<query>`. |
- **10.2 Normalise query** – strip surrounding punctuation, trim, enforce length < 200 chars. |
- **10.3 Cache** – hash query (`sha256`), look up in Redis `search_cache:{hash}`. If hit and not expired, reuse result. |
- **10.4 HTTP request** – `GET https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`. |
- **10.5 Result parsing** – prefer `AbstractText`, fallback to first `RelatedTopics[0].Text`. Trim to ≤ 300 chars. |
- **10.6 Store cache** – `SETEX search_cache:{hash} 14400 <result>` (4 h TTL). |
- **10.7 Inject into LLM** – build a second prompt: “Search result: <result>. Answer the user’s question using only this info.” |
| Deliverables |
- `src/pipeline/search.ts` (query, cache, result handling). |
| Test |
- Query “Who won the 2023 Cricket World Cup?” → verify result string contains “Australia”. |

---

### 11. Voice‑Note Transcription Pipeline

| Goal | Convert incoming audio messages to text, store transcript, and feed it into the normal chat pipeline. |
|------|----------------------------------------------------------------------------------------------|
| Prereqs | Whisper executable (`whisper.cpp`) compiled, or Ollama model `whisper` if available. |
| Tasks |
- **11.1 Media download** – Baileys `downloadMediaMessage(message)` returns a buffer or file path. |
- **11.2 Queue** – enqueue a `voiceJob` with `{ chatId, messageId, mediaPath }`. |
- **11.3 Transcriber** – `src/pipeline/voice.ts` spawns Whisper (`./whisper -m tiny -f ${mediaPath}`) and captures stdout. |
- **11.4 Store transcript** – insert a new `messages` row with `body = transcript`, `mediaType = 'audio'`, `transcribedFrom = originalMessageId`. |
- **11.5 Feed to chat pipeline** – after storing, push the new message ID back onto the `incoming` queue so it follows the same processing flow. |
| Deliverables |
- `src/pipeline/voice.ts` (download → transcribe → store). |
| Test |
- Send a short voice note, verify a text message appears in the conversation view with the correct timestamp. |

---

### 12. Disappearing‑Message Archiver

| Goal | Preserve a permanent record of WhatsApp “ephemeral” messages that would otherwise self‑destruct. |
|------|----------------------------------------------------------------------------------------------|
| Prereqs | `messages` table already stores `isEphemeral` and `ephemeralExpiry`. |
| Tasks |
- **12.1 Ingest** – when a message arrives with `isEphemeral = true`, store `ephemeralExpiry`. |
- **12.2 Scheduler** – `src/cron/archiver.ts` runs every 5 min, queries `SELECT * FROM messages WHERE isEphemeral=1 AND expired=0 AND datetime(ephemeralExpiry) <= datetime('now')`. |
- **12.3 Mark as archived** – update rows `expired = 1`. No deletion occurs; the data remains for dashboard view. |
- **12.4 Dashboard flag** – UI shows an “🕒 (expired)” badge next to those messages. |
| Deliverables |
- `src/cron/archiver.ts` (periodic job). |
| Test |
- Send a 30‑second disappearing message, wait until expiry, run the cron manually, verify `expired` flag set. |

---

### 13. Escalation / Intervention Module

| Goal | Detect messages that need human attention, send a polite deferral, and surface the event in the dashboard. |
|------|-----------------------------------------------------------------------------------------------|
| Prereqs | Classifier intent `ESCALATE`, LLM token `!ESCALATE`. |
| Tasks |
- **13.1 Detection** – in `chatPipeline`, if LLM response starts with `!ESCALATE` **or** classifier returns `REQUEST_FOR_ME`/`EMOTIONAL` with high urgency, branch to escalation. |
- **13.2 Deferral reply** – use a lightweight “deferral” prompt: “Reply: I’ll let Alex know and get back to you soon.” Send via Baileys. |
- **13.3 Record** – insert into `escalations` table (`chatId`, `messageId`, `reason`, `timestamp`, `resolved = 0`). |
- **13.4 Notify dashboard** – emit via WebSocket `escalation:new` with payload (chatId, snippet, reason). |
- **13.5 Resolution API** – `POST /api/escalations/:id/resolve` with body `{ action: "reply" | "hint" | "dismiss", content: "…" }`. <br>• `reply` → send via Baileys, mark `resolved`. <br>• `hint` → feed hint as an extra system instruction to LLM and re‑run Chat Pipeline. |
- **13.6 Auto‑release timer** – schedule a delayed BullMQ job (e.g., 2 h) that checks `resolved = 0`. If still open, either (a) send a second polite nudge or (b) downgrade to normal reply based on confidence. |
| Deliverables |
- `src/pipeline/escalation.ts` (deferral logic, DB insert, WS emit). |
| Test |
- Send “Can you call me now?” → verify deferral message sent, escalation row created, WebSocket event received in a test client. |

---

### 14. Daily / Weekly Brief Generator

| Goal | Summarise activity, tasks, new memories, and unresolved escalations; deliver via dashboard and optional self‑WhatsApp message. |
|------|-------------------------------------------------------------------------------------------|
| Prereqs | Cron library (`node-cron`). |
| Tasks |
- **14.1 Scheduler** – `src/cron/dailyBrief.ts` runs at user‑defined time (default 08:00). |
- **14.2 Data collection** – query: <br>• Unread messages since last brief <br>• New tasks (`status='pending'`) <br>• New memories (`createdAt > lastBrief`) <br>• Open escalations |
- **14.3 Prompt** – system: “Create a concise bullet‑point brief for the user covering the items above.” Feed collected snippets into LLM. |
- **14.4 Store** – insert into `briefs` table (`date`, `contentJson`). |
- **14.5 Dashboard view** – endpoint `/api/briefs/latest` returns the latest JSON; UI renders as a scrollable list. |
- **14.6 Optional self‑delivery** – if `process.env.SELF_DELIVER=true`, call Baileys `sendMessage(myNumber, briefText)`. |
| Deliverables |
- `src/cron/dailyBrief.ts` (generation job). |
| Test |
- Manually trigger the job, inspect `briefs` table, verify dashboard shows the new brief. |

---

### 15. Web Dashboard (React + Vite)

| Goal | Provide a real‑time UI for chats, memories, tasks, escalations, knowledge base, and brief history. |
|------|---------------------------------------------------------------------------------------------|
| Prereqs | Node, npm, `create-vite@react`, Tailwind CSS (optional). |
| Tasks |
- **15.1 Project scaffolding** – `npm create vite@latest dashboard --template react`. |
- **15.2 Install deps** – `axios`, `socket.io-client` (or native WebSocket), `react-query` for data fetching, `tailwindcss` for styling. |
- **15.3 Authentication** – simple token stored in `localStorage`; login screen asks for a secret (matching `process.env.AUTH_SECRET`). |
- **15.4 Routing** – `react-router-dom` with pages: `/chats`, `/chat/:id`, `/tasks`, `/escalations`, `/knowledge`, `/briefs`. |
- **15.5 Core components**: <br>• **ChatList** – fetch `/api/chats`, show unread badge. <br>• **ChatView** – infinite scroll of `/api/chats/:id/messages`; show bot vs. contact bubbles; button “Reply” opens a textarea. <br>• **MemoryPanel** – fetch `/api/chats/:id/memories`, allow edit/delete. <br>• **TaskPanel** – list tasks, confirm/dismiss. <br>• **EscalationInbox** – list unresolved escalations, provide quick reply/hint UI. <br>• **BriefViewer** – display latest daily brief. |
- **15.6 Real‑time updates** – connect to backend WebSocket at `/ws`. Listen for events: `message:new`, `memory:added`, `task:updated`, `escalation:new`. Update React Query caches accordingly. |
- **15.7 Search UI** – global search bar calls `/api/chats/:id/messages?search=term` (SQLite FTS). |
- **15.8 Knowledge Base editor** – simple markdown textarea, POST to `/api/knowledge`. |
- **15.9 Build & Deploy** – `npm run build`; serve static files from Express (`app.use(express.static('dashboard/dist'))`). |
| Deliverables |
- `dashboard/src/` (React source) <br> - `dashboard/vite.config.ts` (proxy to `/api`) |
| Test |
- Run `npm run dev`, open `http://localhost:5173`, verify chat list loads, send a manual reply, see it appear instantly. |

---

### 16. Express API Server

| Goal | Expose REST endpoints, serve the dashboard static bundle, and push WebSocket events. |
|------|------------------------------------------------------------------------------------|
| Prereqs | `express`, `ws` (or `socket.io`), `cors`. |
| Tasks |
- **16.1 Initialise** – `src/api/server.ts` creates an Express app, applies JSON body parser, CORS for `http://localhost:5173`. |
- **16.2 Route registration** – mount routers from `src/api/routes/*.ts` (chats, messages, memories, tasks, escalations, knowledge, brief, query, search). |
- **16.3 Error handling** – generic error middleware that logs and returns `{ error: message }`. |
- **16.4 WebSocket server** – create a `ws` server on the same HTTP server; maintain a set of connected clients. Provide helper `broadcast(event, payload)` used by other modules (e.g., `escalation.ts`, `chatPipeline.ts`). |
- **16.5 Static serving** – after `npm run build` in dashboard, copy `dashboard/dist` into `public/` and serve with `app.use(express.static('public'))`. |
| Deliverables |
- `src/api/server.ts` (main entry) <br> - `src/api/routes/*.ts` (endpoint handlers). |
| Test |
- Start server, `curl http://localhost:3000/api/chats` → returns JSON list. <br> - Open dashboard, confirm WS connection is alive (console log “WS connected”). |

---

### 17. LLM Query Endpoint (Dashboard‑side Knowledge Search)

| Goal | Let you ask natural‑language questions about the entire chat archive (e.g., “When did I last talk about the budget?”). |
|------|------------------------------------------------------------------------------------|
| Prereqs | Same Ollama chat model used for normal replies. |
| Tasks |
- **17.1 Endpoint** – `POST /api/query` expects `{ question: string }`. |
- **17.2 Retrieval** – <br>• Run a SQLite full‑text search on `messages.body` for keywords extracted from the question (use simple tokenisation). <br>• Run a Chroma similarity search on the knowledge‑base collection with the question embedding, retrieve top 5 snippets. |
- **17.3 Prompt composition** – System: “You are a personal assistant. Use the following chat excerpts and knowledge snippets to answer the user’s question concisely. Do not fabricate info. If you don’t know, say so.” Append both result sets, then the user’s question. |
- **17.4 LLM call** – send to Ollama, return the generated answer. |
| Deliverables |
- `src/api/routes/query.ts`. |
| Test |
- Ask “What did I promise to send to Maya?” → verify answer contains the correct task description. |

---

### 18. Configuration Management

| Goal | Centralise all tunables (model names, thresholds, timings) in a JSON/YAML file and expose via env overrides. |
|------|------------------------------------------------------------------------------------------|
| Tasks |
- Create `config/default.json` with sections: `models`, `queue`, `escalation`, `brief`, `search`, `persona`. |
- Load with `config = require('config')` (npm `config`). |
- Document each key (e.g., `models.main = "llama3"`). |
| Deliverables |
- `config/default.json`. |
| Test |
- Change `models.main` to a different Ollama model, restart, verify that new model is used in replies. |

---

### 19. CI / Testing Pipeline (Local)

| Goal | Ensure each component can be verified automatically before deployment. |
|------|--------------------------------------------------------------------------|
| Tasks |
- **19.1 Unit tests** – `jest` for pure functions (prompt builders, DB helpers). |
- **19.2 Integration tests** – spin up a temporary Redis container, start the worker, push a synthetic message job, assert that a reply appears in a mock Baileys client (use `sinon` to stub `sendMessage`). |
- **19.3 End‑to‑end** – launch the full stack (`npm run dev`), use a headless browser (Playwright) to open the dashboard, send a manual reply, ensure the message appears in the chat view. |
- **19.4 Lint & format** – `eslint` + `prettier`. |
| Deliverables |
- `package.json` scripts: `"test": "jest"`, `"e2e": "playwright test"`. |
| Test |
- Run `npm test`; all suites pass. <br> - Run `npm run e2e`; verify dashboard interaction works. |

---

### 20. Deployment Checklist

| Item | Verify |
|------|--------|
| **Redis** running & reachable (`redis-cli ping`). |
| **ChromaDB** listening on configured port, collections created. |
| **Ollama** models pulled (`ollama list`). |
| **SQLite DB** migrated (`SELECT name FROM sqlite_master`). |
| **Baileys** QR login completed, auth persisted. |
| **Express** listening on `process.env.PORT` (default 3000). |
| **Dashboard** served (`http://localhost:3000` shows UI). |
| **Cron jobs** active (`ps aux | grep node`). |
| **WebSocket** connections alive (dashboard console shows “connected”). |
| **Backups** – schedule a daily copy of `data/wa.db` and `data/chroma` directory. |
| **Monitoring** – optional `pm2` or systemd service with auto‑restart. |

---

### 21. Handoff Summary for External Teams

| Component | Owner | Primary Files | Success Metric |
|-----------|-------|----------------|----------------|
| Baileys client | Backend engineer | `src/baileys/*` | Stable socket, auth persisted, events emitted. |
| Queue layer | DevOps / backend | `src/queue/*` | Jobs processed without loss, retries work. |
| SQLite + migrations | Database admin | `src/db/*` | Schema matches spec, data integrity checks pass. |
| Chroma vector store | ML engineer | `src/db/chroma.ts` | Embeddings stored, similarity query returns correct IDs. |
| Classifier / routing | ML engineer | `src/pipeline/classifier.ts` | >90 % intent accuracy on test set. |
| Chat pipeline | Backend engineer | `src/pipeline/chatPipeline.ts` | Replies sent, escalation token recognised. |
| Persona mirroring | NLP engineer | `src/pipeline/persona.ts` | Persona summary updates every 50 msgs. |
| Memory extraction | NLP engineer | `src/pipeline/extraction.ts` | New facts appear in `memories` table. |
| Task extraction | Product owner | `src/pipeline/tasks.ts` | Tasks appear with correct due dates. |
| Search module | Backend engineer | `src/pipeline/search.ts` | Live web answers returned within 1 s. |
| Voice transcription | Audio engineer | `src/pipeline/voice.ts` | Audio → text accuracy > 85 % on sample set. |
| Archiver | Backend engineer | `src/cron/archiver.ts` | Ephemeral messages flagged as expired. |
| Escalation handler | Product owner | `src/pipeline/escalation.ts` | All high‑urgency messages land in dashboard queue. |
| Daily brief generator | Ops | `src/cron/dailyBrief.ts` | Brief appears each morning, includes all sections. |
| Dashboard UI | Front‑end engineer | `dashboard/src/*` | Real‑time updates, manual reply works. |
| API server | Full‑stack engineer | `src/api/*` | All endpoints respond, auth enforced. |
| CI / Tests | QA | `tests/*`, `jest.config.js` | 100 % passing on CI run. |

---

### 22. Next‑Step Recommendations

1. **Spin up the base services** (Redis, Chroma, Ollama) and run the migration script.  
2. **Implement Baileys client** and verify message flow.  
3. **Add the queue and a stub worker** that simply logs incoming jobs.  
4. **Iteratively plug in each pipeline stage** (classifier → chat pipeline → memory extraction).  
5. **Build the dashboard skeleton** (chat list + message view) and connect it to the API.  
6. **Layer on the advanced features** (voice, search, escalation, daily brief) once the core loop is stable.  