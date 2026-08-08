# Project Task List

## Phase 0 – Foundation
- `[x]` 0.1 Set up Node.js project, install deps
- `[/]` 0.2 Redis & Chroma (Docker) (Pending: Docker Desktop Install)
- `[x]` 0.3 SQLite schema migration (base)
- `[x]` 0.4 Baileys auth persistence
- `[x]` 0.5 Baileys socket wrapper
- `[x]` 0.6 Event emitter (internal bus)
- `[x]` 0.7 BullMQ queue setup
- `[x]` 0.8 Message router → job producer

## Phase 1 – Core Chat Pipeline
- `[x]` 1.1 Worker skeleton
- `[x]` 1.2 Conversation context loader (SQLite)
- `[x]` 1.3 Ollama integration
- `[x]` 1.4 System prompt templates
- `[x]` 1.5 Chat pipeline (build prompt, send)
- `[ ]` 1.6 Basic auto-reply test (1 contact)

## Phase 2 – Memory Foundation
- `[x]` 2.1 ChromaDB client wrapper
- `[x]` 2.2 Ollama embedding function
- `[x]` 2.3 Memory retrieval (query on new msg)
- `[x]` 2.4 Memory extraction prompt + LLM call
- `[x]` 2.5 Store extracted facts in SQLite+Chroma
- `[x]` 2.6 Injection into chat prompt

## Phase 3 – Multi-Model Chauffeur & Persona
- `[x]` 3.1 Intent classifier prompt + model
- `[x]` 3.2 Classifier module
- `[x]` 3.3 Routing logic (switch on intent)
- `[x]` 3.4 Specialist model prompts (business/casual)
- `[x]` 3.5 Persona extraction from history
- `[x]` 3.6 Inject persona into system prompt
- `[x]` 3.7 Per-chat persona storage & refresh

## Phase 4 – Dashboard MVP
- `[x]` 4.1 Express server skeleton
- `[x]` 4.2 REST API routes (chats, messages, rules)
- `[x]` 4.3 WebSocket relay
- `[x]` 4.4 React project scaffold
- `[x]` 4.5 Chat list & message view (with scroll)
- `[x]` 4.6 Manual reply capability
- `[x]` 4.7 Rule editor per chat
- `[x]` 4.8 Auth (simple token)

## Phase 5 – Intervention & Escalation
- `[x]` 5.1 Escalation detection token
- `[x]` 5.2 Deferral reply template
- `[x]` 5.3 Escalation recording & WS notification
- `[x]` 5.4 Dashboard escalation queue
- `[x]` 5.5 Resolution API + feedback loop
- `[ ]` 5.6 Auto-release timer (optional)

## Phase 6 – Task Extraction & Integration
- `[x]` 6.1 Task extraction prompt
- `[x]` 6.2 Extraction module (run after reply)
- `[x]` 6.3 SQLite tasks table
- `[x]` 6.4 Dashboard tasks panel
- `[ ]` 6.5 External sync (Todoist/Notion) (Optional/Future)

## Phase 7 – Voice Transcription Pipeline
- `[x]` 7.1 Media download helper (Baileys)
- `[x]` 7.2 Whisper.cpp / Ollama Whisper setup (Mocked)
- `[x]` 7.3 Voice job worker
- `[x]` 7.4 Store transcript, re-enqueue
- `[x]` 7.5 Dashboard media player (via transcript text)

## Phase 8 – Disappearing-Message Archiver
- `[x]` 8.1 Ephemeral flag capture (Baileys)
- `[x]` 8.2 Archiver cron job
- `[x]` 8.3 Dashboard indicator for expired msgs

## Phase 9 – Knowledge Base & Web Search
- `[x]` 9.1 Knowledge-base seeding pipeline
- `[x]` 9.2 File upload endpoint + UI
- `[x]` 9.3 KB snippet injection into prompts
- `[x]` 9.4 Web search module
- `[x]` 9.5 DuckDuckGo client & caching
- `[x]` 9.6 Integration with classifier / LLM
- `[x]` 9.7 Dashboard search bar + KB editor

## Phase 10 – Advanced Features
- `[ ]` 10.1 Rate-limiter & typing delay
- `[ ]` 10.2 Message deduplication (unique key)
- `[ ]` 10.3 Dead-letter queue + dashboard
- `[ ]` 10.4 Users table, userId in all tables
- `[ ]` 10.5 JWT auth & middleware
- `[ ]` 10.6 Log sanitisation
- `[ ]` 10.7 Backup cron + restore docs
- `[ ]` 10.8 Group chat reply toggle
- `[ ]` 10.9 Media vision pipeline
- `[ ]` 10.10 Status handling toggle
- `[ ]` 10.11 Web dashboard switches for all new features

## Phase 11 – Daily Briefs & LLM Query Dashboard
- `[ ]` 11.1 Data-gathering cron (unread, tasks, escalations)
- `[ ]` 11.2 Summarization prompt + LLM call
- `[ ]` 11.3 Brief storage & dashboard view
- `[ ]` 11.4 Optional self-delivery to your WhatsApp
- `[ ]` 11.5 Dashboard LLM query endpoint
- `[ ]` 11.6 Query UI (natural-language about archive)

## Phase 12 – Hardening, Testing & Deployment
- `[ ]` 12.1 Unit tests (prompts, DB helpers)
- `[ ]` 12.2 Integration tests (queue → reply)
- `[ ]` 12.3 E2E tests (dashboard actions)
- `[ ]` 12.4 Security audit (auth, sanitisation)
- `[ ]` 12.5 Performance tuning (message volume)
- `[ ]` 12.6 Documentation (README, API docs)
- `[ ]` 12.7 Containerisation (Docker Compose)
- `[ ]` 12.8 Production checklist & deployment
