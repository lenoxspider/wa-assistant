---

## 1. Project Overview

**Objective:**  A personal WhatsApp AI assistant that:

- Auto-replies to incoming messages using a local LLM (Ollama) with full memory and persona awareness.
- Extracts facts and tasks from conversations and persists them.
- Routes messages to the most appropriate specialist model (“multi-model chauffeur”).
- Mirrors your communication style.
- Answers questions using your personal knowledge base and live web search.
- Transcribes voice notes, archives disappearing messages, and generates daily/weekly conversation digests.
- Defers to you when a message requires human intervention.
- Exposes a web dashboard for monitoring, manual replies, memory management, and natural-language querying of your entire chat history.

---

## 2. Technology Stack

| Layer                | Choice                                        | Rationale                                                           |
|----------------------|-----------------------------------------------|---------------------------------------------------------------------|
| WhatsApp interface   | `@whiskeysockets/baileys`                     | Multi-device, no web scraping, full socket control.                 |
| Runtime              | Node.js (TypeScript optional)                 | Ecosystem alignment, Baileys support, single-language stack.        |
| Server framework      | Express.js                                    | API + dashboard backend.                                            |
| Queue                | BullMQ + Redis                                | Reliable job processing; smooth integration with Node.js.           |
| Database – messages/rules | SQLite (via `better-sqlite3`)             | Zero infra, fast, single-user friendly.                             |
| Vector database      | ChromaDB (embedded/local HTTP server)         | Semantic memory retrieval; runs alongside.                          |
| LLM stack            | Ollama (multiple models)                      | Local, private, no API costs.                                       |
| Embeddings model     | `nomic-embed-text` (Ollama)                   | Lightweight, fast, good for similar-fact retrieval.                 |
| Speech-to-text       | Whisper.cpp / local Whisper (via Ollama)      | Voice note transcription, no cloud dependency.                      |
| Text-to-speech (opt) | Piper / local TTS engine                      | For future voice replies.                                           |
| Web dashboard        | React (Vite) + Tailwind CSS                   | Modern, lightweight, easy to iterate.                               |
| Search API           | DuckDuckGo Instant Answer (free) or SearXNG   | No keys, privacy-respecting.                                        |
| Scheduler            | `node-cron` / BullMQ delayed jobs            | For daily digests and periodic tasks.                               |
| Task integration     | Local Markdown/ICal file or REST bridge to Todoist/Notion | Extensible.                                                       |

---

## 3. High-Level System Architecture

```
[Baileys Socket] → [Message Router] → [BullMQ Queue] → [Worker]
                                                         │
                                                         ▼
                                          [Multi-Model Classifier]
                                                         │
                          ┌──────────────┬───────────────┼───────────────┐
                          ▼              ▼               ▼               ▼
                   [Chat Pipeline] [Voice Pipeline] [Search Pipeline] [Escalation]
                          │              │               │               │
                          ▼              │               │               │
                    [Ollama LLM] ◄───────┘               │               │
                          │                              │               │
                          ▼                              ▼               │
                   [Memory System]                [Web Dashboard]  ◄─────┘
                  (Chroma + SQLite)                    ▲
                                                      │
                                              [Express API Server]
```

All modules communicate via the internal API (Express) or directly through the job worker. The worker handles message processing, memory extraction, task creation, and archiving. The dashboard is distinct and can run on a separate port.

---

## 4. Module Descriptions

### 4.1 Baileys WhatsApp Client

- Manages persistent authentication using SQLite (`auth_creds` table).
- Connects via websocket; emits events: `messages.upsert`, `messages.update`, `messages.delete`, `group-participants.update`, and `call`.
- On `messages.upsert`, filters out self-sent messages (configurable) and enqueues the message in **BullMQ** (`whatsapp-incoming` queue).
- Provides a send function (`sendMessage`) that also enqueues outgoing messages (for future analysis/archive).

Configuration:  
- Auto‑reconnect with exponential backoff.  
- Log suppressed unless debug mode is active.  
- Stores **disappearing‑message metadata** (expiration timestamp, chat JID) in a dedicated table, even if the message is ephemeral on the client.

### 4.2 Message Router & Queue

- Thin relay: listens for Baileys events, normalises payload into a standardised object:
  ```
  {
    messageId, chatId, senderJid, body, timestamp,
    isGroup, mentionedJids, hasMedia, mediaType,
    isEphemeral, ephemeralExpiry,
    rawEvent (stored for forensic purposes)
  }
  ```
- Pushes the job into `incoming-messages` queue with delayed retry strategy.

### 4.3 Conversation Context Manager

- SQLite table `messages` stores all incoming/outgoing messages permanently (including ephemeral ones).
- For a given `chatId`, the worker fetches:
  - Last N messages (configurable, e.g., 30).
  - Relevant memory facts (via Chroma + SQLite).
  - The chat’s automation rules (`rules` table).
  - A dedicated **persona profile** for that contact (see “Persona Mirroring”).
- Also maintains a short‑term cache in Redis (keyed by chat ID) to avoid repeated DB reads within a short burst.

### 4.4 Multi‑Model Chauffeur

- Intent classifier: a lightweight Ollama model (e.g., `phi` or a fine-tuned tiny model) that takes the latest message + context snippet and outputs a structured JSON:
  ```json
  {
    "intent": "question|statement|request_for_me|emotional_escalation|task_promise|needs_search|needs_voice_reply|...",
    "urgency": "low|medium|high",
    "routing_target": "main_persona|specialist_business|specialist_casual|search|escalation"
  }
  ```
- Routing targets map to different Ollama models (or different system prompts). For example:
  - `main_persona` – general chat model with full persona instructions.
  - `specialist_business` – model trained on your professional communication (via few-shot examples in the prompt).
  - `specialist_casual` – relaxed tone.
  - `search` – triggers the search module (see 4.8).
  - `escalation` – triggers intervention flow.
- Each model receives a tailored system prompt template stored in a configuration file.

### 4.5 Chat Pipeline (Core Reply Generator)

- Builds a dynamic prompt for the selected model:
  ```
  System:
  - You are [user]’s assistant.
  - Your communication style mirrors this persona: [extracted persona traits].
  - Knowledge base excerpts: [top 3 relevant snippets from user KB].
  - Memories about sender: [fetched memory facts].
  - If the message demands personal interaction, reply with "!ESCALATE" as the first token.
  
  Conversation history:
  [last N messages]
  
  User message: [latest incoming text]
  ```
- Post‑processing:
  - If reply starts with `!ESCALATE`: skip send, create escalation event.
  - If reply is empty: do nothing.
  - Otherwise, send via Baileys using `sendMessage`.
- **Persona mirroring** is achieved by maintaining a per‑contact “persona card” in SQLite: a short summary of style, preferred topics, formality, and common phrases. This card is updated periodically (every 50 messages) by asking the main LLM to generate a new summary from the conversation history.

### 4.6 Memory System

**Short‑term:**  The conversation window itself.

**Long‑term (facts & context):**

- Two‑step process: **retrieval** and **extraction**.
- **Retrieval:** Embed the latest message using Ollama embedding model → query ChromaDB collection `memories` for top 5 similar vectors → return `embedding_id` → look up full fact in SQLite `memories` table.
- **Extraction:** After a reply is sent, a background worker (separate BullMQ job) calls a lightweight extraction prompt to the LLM (e.g., `phi`):
  ```text
  You are a fact extractor. Given the conversation, output a JSON list of new facts about the other person. Example:
  [{"attribute":"location","value":"Berlin","confidence":"high"}]
  Conversation: ...
  ```
- Extracted facts are stored as:
  - SQLite row with `chat_id, sender_jid, attribute, value, confidence, embedding_id, timestamp`.
  - Text `"sender's attribute: value"` embedded and upserted into ChromaDB (idempotent via a hash of the text).
- Dashboard offers manual memory editing and injection.

### 4.7 Web Search Module

- Triggered when the classifier returns `needs_search` or the main LLM decides during the Chat Pipeline (via a tool‑use pattern: the LLM can output a special token `!SEARCH:query`).
- Implementation:
  - The worker makes an HTTP request to DuckDuckGo Instant Answer API (or a local SearXNG instance) with the extracted query.
  - Caches results in Redis with TTL of 4 hours to avoid repeated lookups.
  - The search snippet is injected into a second prompt call: “Using this search result, generate a reply”.
- Dashboard also exposes a search bar that can be used manually to update the knowledge base.

### 4.8 Task Extraction & Integration

- A dedicated prompt (triggered after reply generation, within the same memory pipeline) identifies task‑like language:
  “Review the conversation and output any tasks or commitments. Format: { "task": "...", "due_by": "date if mentioned", "assigned_to": "me or contact", "confidence": "high" }”.
- Extracted tasks are stored in SQLite `tasks` table.
- Integration: A cron job (or immediate) creates a local `.ics` file in a watched directory, or pushes to Todoist/Notion via their REST API if credentials are configured.
- Dashboard shows pending tasks with ability to confirm, dismiss, or edit.
- If a task is assigned to a contact (“You’ll send the report”), the bot can later (via a scheduled job) nudge the contact when the due date approaches (with approval from you).

### 4.9 Automated Daily/Weekly Brief

- A cron job runs at a user‑configurable time (e.g., 8 AM).
- Worker fetches:
  - All unread messages and new conversations since last brief.
  - Any extract tasks pending.
  - Key memory changes (new facts).
  - Escalation items still unresolved.
- Feeds this data into a summarization prompt for the LLM, producing a structured digest.
- The digest is stored in SQLite and rendered in a special dashboard view.
- Optionally, the digest can be sent to your own WhatsApp number as a message (self‑delivery via Baileys).

### 4.10 Voice‑Note Transcription Pipeline

- Incoming messages with `mediaType = 'audio'` are queued into a separate `voice-jobs` queue.
- Worker downloads the audio buffer (Baileys provides a URL or buffer when using `downloadMediaMessage`).
- Passes the buffer to the local Whisper engine (via Ollama’s API or a separate `whisper.cpp` process) to transcribe.
- The transcript is stored as a system message in the `messages` table (with reference to the original audio ID) and then fed into the main pipeline as if it were a text message.
- The original audio is archived for future reference until user purges via dashboard.

### 4.11 Disappearing Message Archiver

- On message receipt, if `isEphemeral` is true, the message is stored normally (all messages are stored anyway).
- A separate process monitors the `messages` table for messages with `ephemeral_expiry` timestamps that have passed. Once the timer expires (or the message is otherwise deleted), the row is marked as `deleted = 1` but NOT removed.
- The dashboard shows a special “Disappearing Messages” tab, keeping a permanent record of what should have vanished.
- This requires Baileys to report `messages.update` with `status: 'DELETED'` or similar. To capture true ephemeral deletion, we may need to intercept the broadcast marker. This is technically feasible via Baileys’ raw event handler.

### 4.12 Intervention Escalation Module

- Triggered when the classifier labels `request_for_me`, `emotional_escalation`, or high urgency, or when the main LLM returns `!ESCALATE`.
- Process:
  1. Send an immediate, polite “I’ll let [user] know” reply (using a separate quick‑response model to avoid delay).
  2. Create an escalation event in SQLite (`escalations` table: `id, chatId, messageId, reason, timestamp, resolved`).
  3. Push a WebSocket notification to the dashboard.
- Dashboard shows an “Action Required” queue:
  - View full chat history.
  - Options: **Reply myself** (write and send), **Give the bot a hint** (enter text, bot generates reply), **Release** (let bot answer now), **Dismiss**.
  - When the user manually replies, that reply is logged and used to tune the escalation classifier (feedback loop).
- Timer‑based auto‑release: after N hours, if still unresolved, can send a second deferral or, for low‑confidence escalations, let the bot attempt an answer.

### 4.13 Web Dashboard

**Frontend (React):**
- **Chat List** – shows all conversations, last message snippet, unread count, bot‑reply status.
- **Chat Detail** – full message thread, color‑coded (bot vs. contacts). Real‑time updates via WebSockets or polling.
- **Memory Browser** – per‑contact facts, editable, with search.
- **Task Panel** – list of extracted tasks, due dates, confirm/dismiss.
- **Escalation Inbox** – action‑required list with intervention widget.
- **Daily Brief** – latest digest, archive of past briefs.
- **Knowledge Base Manager** – interface to add/edit your personal notes that get injected into prompts.
- **Search Chat** – full‑text search across messages via SQLite FTS or direct query.
- **Dashboard LLM Query** – text input where you can ask natural‑language questions about your chat archive (same backend as chat query API).
- **Settings** – automation rules per chat, persona profiles, API keys (if external integrations used), model selection.

**Backend API (Express):**
See §6 for endpoint list.

**Authentication:**  Simple password/token‑based auth for the dashboard (single‑user). Optional OAuth2.

### 4.14 API Server (Express)

- Serves both the REST API and (in development) the React static build.
- Includes WebSocket support for real‑time dashboard updates (using `ws` or Socket.IO).
- Middleware: JSON parsing, CORS for dashboard, logging.
- Separate port from the worker process, but same Node.js process for simplicity.

---

## 5. Data Architecture

### 5.1 SQLite Tables

| Table          | Purpose                                            |
|----------------|----------------------------------------------------|
| `auth_creds`   | Baileys authentication state (key‑value).          |
| `chats`        | Chat metadata: `jid`, `name`, `isGroup`, `lastActivity`. |
| `messages`     | All messages: `id`, `chatId`, `senderJid`, `body`, `timestamp`, `fromMe`, `mediaType`, `mediaBufferRef` (optional path), `isEphemeral`, `ephemeralExpiry`, `deleted`, `transcribedFrom` (for voice). |
| `rules`        | Automation per chat: `chatId`, `autoReplyEnabled`, `triggersJson`, `silenceDuration`. |
| `memories`     | Extracted facts: `id`, `chatId`, `senderJid`, `attribute`, `value`, `confidence`, `embeddingId`, `createdAt`. |
| `personas`     | Per‑contact persona card: `senderJid`, `traitsJson`, `lastUpdated`. |
| `tasks`        | Extracted tasks: `id`, `chatId`, `description`, `dueBy`, `assignedTo`, `confidence`, `status` (pending/confirmed/done), `externalSyncStatus`. |
| `escalations`  | Escalation events: `id`, `chatId`, `messageId`, `reason`, `timestamp`, `resolvedBy`, `resolution`. |
| `knowledgebase`| Personal notes: `id`, `content`, `embeddingId`, `category`, `timestamp`. |
| `search_cache` | Cached web search results: `queryHash`, `result`, `expiry`. |
| `briefs`       | Daily digest: `id`, `date`, `contentJson`, `sent`. |

### 5.2 Chroma Collections

- `memories` – vector embeddings of fact statements.
- `knowledgebase` – embeddings of your personal notes (for prompt injection).

### 5.3 Redis Keys (used by BullMQ and caching)

- `search_cache:{hash}` – web search results.
- `chat_context:{chatId}` – short‑lived conversation window cache.
- `persona_lock:{jid}` – lock to prevent simultaneous persona updates.
- BullMQ queues: `incoming-messages`, `voice-jobs`, `extraction-jobs`.

---

## 6. REST API Endpoints (for Dashboard)

| Method | Endpoint                    | Description                                |
|--------|-----------------------------|--------------------------------------------|
| GET    | `/api/chats`                | List all chats (with last message, unread). |
| GET    | `/api/chats/:id/messages`   | Paginated messages, `?limit=100`.          |
| POST   | `/api/chats/:id/reply`      | Send a manual reply from dashboard.        |
| GET    | `/api/chats/:id/memories`   | List extracted facts for that chat.        |
| POST   | `/api/memories/:id`         | Edit or delete a memory.                   |
| GET    | `/api/tasks`                | All pending tasks.                         |
| POST   | `/api/tasks/:id/confirm`    | Confirm or dismiss.                        |
| GET    | `/api/escalations`          | Unresolved escalations.                    |
| POST   | `/api/escalations/:id/resolve` | Resolve with user action.                |
| GET    | `/api/briefs/latest`        | Latest daily digest.                       |
| GET    | `/api/knowledge`            | Knowledge base entries.                    |
| POST   | `/api/knowledge`            | Add/edit entry and re‑embed.               |
| POST   | `/api/query`                | Natural‑language chat query (LLM‑based).   |
| POST   | `/api/search`               | Manual web search from dashboard.          |
| PUT    | `/api/rules/:chatId`        | Update automation rules.                   |

---

## 7. File / Directory Structure

```
wa-assistant/
├── package.json
├── .env                      (OLLAMA_HOST, CREDS_DB, etc.)
├── config/
│   ├── default.json          (model names, pipeline settings)
│   └── prompts/              (system prompt templates)
│       ├── main_persona.txt
│       ├── business.txt
│       ├── casual.txt
│       ├── extractor.txt
│       ├── summarizer.txt
│       └── task_extractor.txt
├── src/
│   ├── index.js              (entry point – starts worker + API server)
│   ├── baileys/
│   │   ├── client.js         (socket creation, auth, event forwarding)
│   │   └── send.js           (send message wrapper)
│   ├── queue/
│   │   ├── connection.js     (Redis + BullMQ setup)
│   │   ├── producer.js       (enqueue helpers)
│   │   └── worker.js         (main message processing logic)
│   ├── pipeline/
│   │   ├── classifier.js     (multi‑model router)
│   │   ├── chatPipeline.js   (build prompt, call LLM, send reply)
│   │   ├── memory/
│   │   │   ├── retrieval.js  (Chroma query)
│   │   │   ├── extraction.js (fact extraction and storage)
│   │   │   └── store.js      (SQLite + Chroma insert/update)
│   │   ├── search.js         (web search module)
│   │   ├── tasks.js          (task extraction and sync)
│   │   ├── voice.js          (transcription handler)
│   │   ├── archiver.js       (disappearing message archiver)
│   │   └── escalation.js     (intervention logic)
│   ├── db/
│   │   ├── sqlite.js         (SQLite connection, migration)
│   │   ├── chroma.js         (ChromaDB client)
│   │   └── migrations/       (schema versions)
│   ├── api/
│   │   ├── server.js         (Express app + WebSocket)
│   │   ├── routes/           (all route handlers)
│   │   ├── middleware/       (auth, validation)
│   │   └── liveRelay.js      (WebSocket broadcasting)
│   ├── dashboard/            (React source, built separately)
│   └── cron/
│       ├── dailyBrief.js
│       └── taskNudge.js
├── dashboard/                (if integrated monorepo)
│   ├── src/ ...
│   └── vite.config.js
├── data/                     (runtime data: SQLite DB, uploaded media)
├── logs/
└── scripts/
    ├── setup.sh
    └── seed_knowledge.js
```

---

## 8. Configuration & Environment

Key environment variables:

- `OLLAMA_HOST` – URI of Ollama API (e.g., `http://localhost:11434`).
- `CHROMA_HOST` / `CHROMA_PORT` – Chroma server location.
- `DATABASE_PATH` – SQLite file path.
- `REDIS_URL` – Redis connection string (with fallback to localhost).
- `WHISPER_BINARY` – Path to Whisper executable if using external.
- `SEARCH_API_URL` – DuckDuckGo base or SearXNG.
- `DASHBOARD_PORT` – port for web UI.
- `AUTH_SECRET` – simple token for dashboard.

All prompts are externalised in the `config/prompts` folder, editable without code changes.

---

## 9. Implementation Phases (Rebased with All Features)

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| **1** | **Core WhatsApp & Queue** | Baileys client, SQLite schema, basic incoming queue, console logging. |
| **2** | **First auto‑reply** | Chat pipeline with hardcoded prompt, Ollama integration, simple send; deploy to test contact. |
| **3** | **Memory foundation** | ChromaDB setup, embedding, retrieval in prompt, extraction loop, manual memory viewer in dashboard stub. |
| **4** | **Multi‑Model & Persona** | Intent classifier, model routing, persona extraction from history, injection into prompts. |
| **5** | **Dashboard MVP** | React chat viewer, message history, memory browser, basic rules UI. |
| **6** | **Intervention & Tasks** | Escalation queue, manual reply, task extraction, task panel in dashboard. |
| **7** | **Voice & Disappearing** | Audio pipeline, transcription, archiver, media storage. |
| **8** | **Knowledge Base & Web Search** | KB ingestion, prompt injection, search module with caching, dashboard search UI. |
| **9** | **Automated Briefing** | Cron job, digest generator, dashboard digest view, optional WhatsApp self‑delivery. |
| **10**| **Polish & Hardening** | Feedback loops for escalation, UI polish, performance tuning, backup/restore, documentation. |

---

## 10. Observability, Privacy & Security

- All data stored locally; no cloud dependencies except optional task sync.
- Use `winston` or `pino` for structured logging; include correlation IDs per message.
- Baileys auth keys encrypted at rest if desired (encrypt the SQLite file).
- Rate‑limit outgoing messages to avoid WhatsApp’s anti‑spam heuristics (max 1 msg/sec per chat).
- Dashboard access secured behind a simple token; consider HTTPS in deployment.
- Chroma running as local HTTP service not exposed to external network.

---