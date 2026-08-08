## 11. Consolidated Master Implementation Roadmap

This document integrates every component and feature described so far into a single, ordered build plan. Each phase includes dependencies, key deliverables, and estimated effort (in developer days). All detailed component plans are referenced, so you can jump to the relevant section when working on a specific task.

**Effort estimate key:**  
- 🟢 1–2 days  
- 🟡 3–5 days  
- 🔴 1–2 weeks  
- ⚫ 3+ weeks (cross‑cutting or heavy integration)

---

### Phase 0 – Foundation (5 days)

**Goal:** Get the core runtime running: Baileys socket, queue, database.

| ID  | Task                                 | Est.  | Dependencies | Key deliverable(s)                |
|-----|--------------------------------------|-------|--------------|-----------------------------------|
| 0.1 | Set up Node.js project, install deps | 🟢   | –            | `package.json`, `.env`            |
| 0.2 | Redis & Chroma (Docker)              | 🟢   | –            | docker-compose.yml, health checks |
| 0.3 | SQLite schema migration (base)       | 🟢   | –            | `001_init.sql`, migration runner  |
| 0.4 | Baileys auth persistence             | 🟢   | 0.3         | `src/baileys/auth.ts`             |
| 0.5 | Baileys socket wrapper               | 🟡   | 0.4         | `src/baileys/client.ts`           |
| 0.6 | Event emitter (internal bus)         | 🟢   | 0.5         | `src/baileys/events.ts`           |
| 0.7 | BullMQ queue setup                   | 🟢   | 0.2         | `src/queue/connection.ts`         |
| 0.8 | Message router → job producer        | 🟢   | 0.5,0.7     | `src/queue/producer.ts`           |

**Phase‑0 exit criterion:** WhatsApp messages are received, normalized, enqueued, and a stub worker logs them.

---

### Phase 1 – Core Chat Pipeline (5 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s) |
|-----|--------------------------------------|-------|--------------|----------------|
| 1.1 | Worker skeleton                      | 🟢   | 0.8         | `src/queue/worker.ts`             |
| 1.2 | Conversation context loader (SQLite) | 🟡   | 0.3         | `src/db/sqlite.ts` helpers        |
| 1.3 | Ollama integration                   | 🟢   | –            | `src/pipeline/llmClient.ts`       |
| 1.4 | System prompt templates              | 🟢   | –            | `config/prompts/main_persona.txt` |
| 1.5 | Chat pipeline (build prompt, send)  | 🟡   | 1.2–1.4     | `src/pipeline/chatPipeline.ts`    |
| 1.6 | Basic auto‑reply test (1 contact)    | 🟢   | 1.5         | –                                |

**Exit criterion:** Bot replies automatically to a test contact using a static prompt; outgoing messages are logged.

---

### Phase 2 – Memory Foundation (4 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)               |
|-----|--------------------------------------|-------|--------------|------------------------------|
| 2.1 | ChromaDB client wrapper              | 🟢   | 0.2         | `src/db/chroma.ts`           |
| 2.2 | Ollama embedding function            | 🟢   | 1.3         | `embed(text)`                |
| 2.3 | Memory retrieval (query on new msg)  | 🟡   | 2.1,2.2     | `src/pipeline/retrieval.ts`  |
| 2.4 | Memory extraction prompt + LLM call  | 🟡   | 1.3,2.1     | `src/pipeline/extraction.ts` |
| 2.5 | Store extracted facts in SQLite+Chroma| 🟢   | 2.4         | –                            |
| 2.6 | Injection into chat prompt           | 🟢   | 2.3,1.5     | updated `chatPipeline.ts`    |

**Exit criterion:** After a few exchanges, the bot recalls a fact from an earlier message and uses it in a reply.

---

### Phase 3 – Multi‑Model Chauffeur & Persona (5 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)                       |
|-----|--------------------------------------|-------|--------------|--------------------------------------|
| 3.1 | Intent classifier prompt + model     | 🟡   | 1.3         | `config/prompts/classifier.txt`      |
| 3.2 | Classifier module                    | 🟢   | 3.1         | `src/pipeline/classifier.ts`         |
| 3.3 | Routing logic (switch on intent)     | 🟢   | 3.2         | updated `worker.ts`                  |
| 3.4 | Specialist model prompts (business/casual) | 🟢 | 1.4       | `business.txt`, `casual.txt`        |
| 3.5 | Persona extraction from history      | 🟡   | 2.4         | `src/pipeline/persona.ts`            |
| 3.6 | Inject persona into system prompt    | 🟢   | 3.5         | updated `chatPipeline.ts`            |
| 3.7 | Per‑chat persona storage & refresh   | 🟢   | 3.5         | SQLite `personas` table, cron trigger|

**Exit criterion:** A business inquiry gets a formal reply; casual chat gets a relaxed reply. Persona updates after 50 messages.

---

### Phase 4 – Dashboard MVP (6 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)                    |
|-----|--------------------------------------|-------|--------------|-----------------------------------|
| 4.1 | Express server skeleton              | 🟢   | –            | `src/api/server.ts`               |
| 4.2 | REST API routes (chats, messages, rules) | 🟡 | 4.1,0.3     | `src/api/routes/*.ts`             |
| 4.3 | WebSocket relay                      | 🟢   | 4.1         | `src/api/liveRelay.ts`            |
| 4.4 | React project scaffold               | 🟢   | –            | `dashboard/`                      |
| 4.5 | Chat list & message view (with scroll) | 🔴  | 4.2,4.3     | `ChatList.jsx`, `ChatView.jsx`    |
| 4.6 | Manual reply capability              | 🟢   | 4.5,1.5     | text area + send button           |
| 4.7 | Rule editor per chat                 | 🟢   | 4.2         | toggles for auto‑reply            |
| 4.8 | Auth (simple token)                  | 🟢   | 4.1         | login screen, `auth` middleware   |

**Exit criterion:** You can log into the dashboard, scroll through chats, toggle auto‑reply for a contact, and send a manual reply.

---

### Phase 5 – Intervention & Escalation (4 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)                          |
|-----|--------------------------------------|-------|--------------|-----------------------------------------|
| 5.1 | Escalation detection token           | 🟢   | 1.5         | `!ESCALATE` handling in `chatPipeline`  |
| 5.2 | Deferral reply template              | 🟢   | 1.4         | `escalation_defer.txt` prompt           |
| 5.3 | Escalation recording & WS notification | 🟡 | 5.1,4.3     | `src/pipeline/escalation.ts`            |
| 5.4 | Dashboard escalation queue           | 🟡   | 5.3,4.5     | `EscalationInbox.jsx`, reply/hint UI    |
| 5.5 | Resolution API + feedback loop       | 🟡   | 5.4         | `POST /api/escalations/:id/resolve`     |
| 5.6 | Auto‑release timer (optional)        | 🟢   | 5.1         | BullMQ delayed job                       |

**Exit criterion:** A high‑urgency message triggers an escalation card; you can reply manually or give the bot a hint.

---

### Phase 6 – Task Extraction & Integration (3 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)                     |
|-----|--------------------------------------|-------|--------------|------------------------------------|
| 6.1 | Task extraction prompt               | 🟢   | 2.4         | `config/prompts/task_extractor.txt`|
| 6.2 | Extraction module (run after reply)  | 🟡   | 6.1,2.5     | `src/pipeline/tasks.ts`            |
| 6.3 | SQLite `tasks` table                 | 🟢   | 0.3         | migration script                   |
| 6.4 | Dashboard tasks panel                | 🟡   | 6.3,4.5     | `TaskPanel.jsx`                    |
| 6.5 | External sync (Todoist/Notion)       | 🟡   | 6.2         | optional REST bridge               |

**Exit criterion:** A message “I’ll send the report by Friday” creates a task visible in the dashboard.

---

### Phase 7 – Voice Transcription Pipeline (4 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)                    |
|-----|--------------------------------------|-------|--------------|-----------------------------------|
| 7.1 | Media download helper (Baileys)      | 🟢   | 0.5         | `downloadMediaMessage` wrapper    |
| 7.2 | Whisper.cpp / Ollama Whisper setup   | 🔴   | –            | local model, integration test     |
| 7.3 | Voice job worker                     | 🟡   | 7.1,7.2     | `src/pipeline/voice.ts`           |
| 7.4 | Store transcript, re‑enqueue          | 🟢   | 7.3         | insert into `messages`, push back |
| 7.5 | Dashboard media player               | 🟢   | 4.5         | audio playback component          |

**Exit criterion:** An audio message appears as transcribed text in the chat, and the bot replies normally.

---

### Phase 8 – Disappearing‑Message Archiver (2 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)                      |
|-----|--------------------------------------|-------|--------------|-------------------------------------|
| 8.1 | Ephemeral flag capture (Baileys)     | 🟢   | 0.5         | column `ephemeralExpiry` in `messages`|
| 8.2 | Archiver cron job                    | 🟢   | 8.1         | `src/cron/archiver.ts`              |
| 8.3 | Dashboard indicator for expired msgs | 🟢   | 4.5         | badge / filter                       |

**Exit criterion:** A 30‑second disappearing message is still visible in the dashboard after expiry.

---

### Phase 9 – Knowledge Base & Web Search (4 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)                     |
|-----|--------------------------------------|-------|--------------|------------------------------------|
| 9.1 | Knowledge‑base seeding pipeline      | 🔴   | 2.1,2.2     | `src/pipeline/knowledgeBase.ts`    |
| 9.2 | File upload endpoint + UI            | 🟡   | 4.1,4.5     | `KnowledgeUpload.jsx`              |
| 9.3 | KB snippet injection into prompts    | 🟢   | 9.1,1.5     | updated `chatPipeline.ts`          |
| 9.4 | Web search module                    | 🟡   | –            | `src/pipeline/search.ts`           |
| 9.5 | DuckDuckGo client & caching          | 🟢   | 9.4         | Redis cache layer                  |
| 9.6 | Integration with classifier / LLM    | 🟢   | 3.2,9.5     | `!SEARCH:query` handling           |
| 9.7 | Dashboard search bar + KB editor     | 🟡   | 9.2,9.5     | `KnowledgeEditor.jsx`, search panel|

**Exit criterion:** Bot answers “Who won the World Cup?” from live data; and uses your uploaded notes to answer “What’s the project deadline?”

---

### Phase 10 – Advanced Features (6 days)

This phase bundles all the new extension modules: anti‑ban, media vision, group toggle, dedup, dead‑letter, permissions, backup, log sanitisation, status handling.

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)                          |
|-----|--------------------------------------|-------|--------------|-----------------------------------------|
| 10.1| Rate‑limiter & typing delay          | 🟡   | 0.5         | `src/baileys/rateLimiter.ts`           |
| 10.2| Message deduplication (unique key)   | 🟢   | 0.3,0.8     | unique index, producer guard            |
| 10.3| Dead‑letter queue + dashboard        | 🟡   | 0.7,4.5     | `src/queue/deadLetter.ts`, DLQ UI       |
| 10.4| Users table, `userId` in all tables  | 🟡   | 0.3         | `004_users.sql`, migration runner      |
| 10.5| JWT auth & middleware                 | 🟡   | 10.4,4.1    | `src/api/middleware/auth.js`, login page|
| 10.6| Log sanitisation                     | 🟢   | –            | `src/util/logSanitiser.ts`             |
| 10.7| Backup cron + restore docs           | 🟡   | 0.3,0.2     | `scripts/backup.sh`, `docs/RESTORE.md`  |
| 10.8| Group chat reply toggle              | 🟢   | 1.5,3.2     | updated rules, UI switch                |
| 10.9| Media vision pipeline                | 🔴   | 7.1,1.3     | `src/pipeline/vision.ts`, til vision model|
| 10.10| Status handling toggle              | 🟢   | 0.5         | `src/baileys/statusHandler.ts`         |
| 10.11| Web dashboard switches for all new features | 🟡 | 4.5 | settings pages, per‑chat overrides |

**Exit criterion:** All new features are functional; you can control group replies, rate limits, vision, status reads, and see dead letters. System has user‑based authentication. Backups run daily.

---

### Phase 11 – Daily Briefs & LLM Query Dashboard (3 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)                        |
|-----|--------------------------------------|-------|--------------|---------------------------------------|
| 11.1| Data‑gathering cron (unread, tasks, escalations) | 🟡 | 6.4,5.5     | `src/cron/dailyBrief.ts`             |
| 11.2| Summarization prompt + LLM call      | 🟢   | 1.3         | `config/prompts/summarizer.txt`       |
| 11.3| Brief storage & dashboard view       | 🟡   | 11.2,4.5    | `BriefViewer.jsx`                     |
| 11.4| Optional self‑delivery to your WhatsApp | 🟢 | 11.2,0.5    | –                                    |
| 11.5| Dashboard LLM query endpoint         | 🟡   | 4.1,1.3     | `src/api/routes/query.ts`            |
| 11.6| Query UI (natural‑language about archive) | 🟡 | 4.5,11.5    | `ChatQueryBox.jsx`                    |

**Exit criterion:** Every morning you see a digest; you can ask the dashboard “What did I discuss with John about the trip?” and get an accurate answer.

---

### Phase 12 – Hardening, Testing & Deployment (8 days)

| ID  | Task                                 | Est.  | Dependencies | Deliverable(s)                         |
|-----|--------------------------------------|-------|--------------|----------------------------------------|
| 12.1| Unit tests (prompts, DB helpers)     | 🟡   | all          | `jest` suites                          |
| 12.2| Integration tests (queue → reply)    | 🟡   | all          | mock Baileys, real Ollama/Chroma       |
| 12.3| E2E tests (dashboard actions)        | 🔴   | 4.5         | Playwright scripts                     |
| 12.4| Security audit (auth, sanitisation)  | 🟢   | 10.5,10.6   | checklist                              |
| 12.5| Performance tuning (message volume)  | 🟡   | 10.1        | load test                              |
| 12.6| Documentation (README, API docs)     | 🟢   | all          | `README.md`, OpenAPI spec              |
| 12.7| Containerisation (Docker Compose)    | 🟡   | all          | `docker-compose.prod.yml`              |
| 12.8| Production checklist & deployment    | 🟢   | 12.7        | pm2/systemd config, manual             |

**Exit criterion:** Fully tested, documented, containerised; ready to run 24/7 on a VPS.

---

## Master Dependencies Graph (simplified)

```
0.1–0.8 → Phase 1 → Phase 2 → Phase 3 → Phase 4 (runs parallel)
                                     ↘ Phase 5
                                     ↘ Phase 6
Phase 0 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11 → Phase 12
```

---

## Summary of All Deliverable Files

```
wa-assistant/
├── config/                     (all prompts + default.json)
├── src/
│   ├── index.js
│   ├── baileys/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── events.ts
│   │   ├── rateLimiter.ts
│   │   ├── statusHandler.ts
│   │   └── send.ts
│   ├── queue/
│   │   ├── connection.ts
│   │   ├── producer.ts
│   │   ├── worker.ts
│   │   └── deadLetter.ts
│   ├── pipeline/
│   │   ├── classifier.ts
│   │   ├── chatPipeline.ts
│   │   ├── llmClient.ts
│   │   ├── extraction.ts
│   │   ├── retrieval.ts
│   │   ├── persona.ts
│   │   ├── tasks.ts
│   │   ├── voice.ts
│   │   ├── vision.ts
│   │   ├── search.ts
│   │   ├── knowledgeBase.ts
│   │   ├── escalation.ts
│   │   └── dedupCheck.ts (or inline)
│   ├── db/
│   │   ├── sqlite.ts
│   │   ├── chroma.ts
│   │   └── migrations/
│   ├── api/
│   │   ├── server.ts
│   │   ├── liveRelay.ts
│   │   ├── middleware/auth.js
│   │   └── routes/
│   ├── cron/
│   │   ├── archiver.ts
│   │   ├── dailyBrief.ts
│   │   └── backup.ts
│   └── util/
│       └── logSanitiser.ts
├── dashboard/                  (React app)
│   ├── src/
│   │   ├── pages/              (Chats, Tasks, Escalations, Knowledge, Briefs, Settings, DeadLetters)
│   │   ├── components/         (ChatList, ChatView, MemoryPanel, etc.)
│   │   └── ...
│   └── vite.config.js
├── scripts/
│   └── backup.sh
├── docs/
│   └── RESTORE.md
├── docker-compose.yml
└── .env
```

---

**Total estimated effort:** ~60 developer days (single full‑stack dev) or ~40 days with two people working in parallel.

This master plan covers everything, from the first `npm init` to the final containerised deployment. Each phase has a clear entry point and measurable exit criteria, so you can pick up the work at any stage or hand it off to a specialist.




## 12. One-Liner Feature Briefs

Here are all 25 features, each described in one sentence with a simple **Why** and a one-liner **How**.

---

1. **Baileys Connection**  
   **Why:** WhatsApp communication without the official app.  
   **How:** Node.js library to send/receive messages via a real device.

2. **Message normalisation**  
   **Why:** Uniform input for the pipeline.  
   **How:** Convert everything to JSON (text, media, status, disappearing) with a fixed schema.

3. **Queue System**  
   **Why:** Reliable message processing under load.  
   **How:** BullMQ processes messages one by one, handles retries and backoff.

4. **Basic Auto‑reply**  
   **Why:** Instant responses to show it works.  
   **How:** Pattern-based replies for “hello” and “thanks”.

5. **Conversation Context**  
   **Why:** Avoid repetitive questions.  
   **How:** Load last 5–10 messages from SQLite per chat before generating a reply.

6. **Memory System**  
   **Why:** Remember important facts across messages.  
   **How:** Extract key entities/facts using LLM and store them in ChromaDB.

7. **Intent Classifier**  
   **Why:** Distinguish questions, commands, small talk, escalations.  
   **How:** Mini-model that labels each incoming message with intent.

8. **Persona System**  
   **Why:** Consistent tone of voice.  
   **How:** Build a mini‑persona from message history and inject it into prompts.

9. **Business vs Casual**  
   **Why:** Right tone for right context.  
   **How:** Route to different prompt templates based on detected intent.

10. **Escalation Handling**  
    **Why:** Don’t lose critical messages.  
    **How:** Detect “urgent/escalation” keywords and notify immediately via dashboard.

11. **Task Extraction**  
    **Why:** Don’t let requests slip through cracks.  
    **How:** Extract action items (“I’ll send X by Friday”) and store as tasks.

12. **Media Vision**  
    **Why:** Understand images, screenshots, PDFs.  
    **How:** Send media to vision model and include description in the chat prompt.

13. **Voice Transcription**  
    **Why:** Reply to voice notes.  
    **How:** Whisper/WhisperXtranscribe audio → normalise → re‑queue for normal processing.

14. **Disappearing Messages**  
    **Why:** Respect privacy settings.  
    **How:** Detect ephemeral flag → archive immediately → hide from normal view.

15. **Knowledge Base**  
    **Why:** Answer questions from your documents.  
    **How:** Upload PDFs/text → chunk + index in Chroma → retrieve and inject snippets.

16. **Web Search**  
    **Why:** Answer breaking news / live info questions.  
    **How:** Trigger search for out‑of‑domain queries and summarise results.

17. **Rate Limiter**  
    **Why:** Avoid WhatsApp’s aggressive anti‑ban.  
    **How:** Enforce delays between messages and per‑user cooldowns.

18. **Message Deduplication**  
    **Why:** Don’t reply twice to the same message.  
    **How:** Generate hash per message → ignore if already processed.

19. **Dead‑letter Queue**  
    **Why:** Inspect failed messages.  
    **How:** Move messages that fail >3 times to a DLQ and notify on dashboard.

20. **Users Table**  
    **Why:** Per‑user permissions and settings.  
    **How:** Add `users` table and foreign key to all primary data.

21. **Authentication**  
    **Why:** Secure dashboard access.  
    **How:** JWT-based login for dashboard users.

22. **Log Sanitisation**  
    **Why:** Don’t leak phone numbers/PII in logs.  
    **How:** Redact PII in all logging and error outputs.

23. **Backup / Restore**  
    **Why:** Disaster recovery.  
    **How:** Daily backup scripts (SQLite + Chroma) and restore guide.

24. **Group Toggle**  
    **Why:** Optional group participation.  
    **How:** Add “auto‑reply on/off” rule per chat.

25. **Daily Brief**  
    **Why:** Catch up quickly in the morning.  
    **How:** Daily digest of unread messages, tasks, escalations, and a summary.

---

This list gives you a clear, single-sentence understanding of every feature and its role in the final system.