# Project Task List

## Phase 0 – Foundation
- `[x]` 0.1 Set up Node.js project, install deps
- `[x]` 0.2 Redis & Chroma (Docker)
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
- `[x]` 1.6 Basic auto-reply test (1 contact)

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
- `[x]` 5.6 Auto-release timer

## Phase 6 – Task Extraction & Integration
- `[x]` 6.1 Task extraction prompt
- `[x]` 6.2 Extraction module (run after reply)
- `[x]` 6.3 SQLite tasks table
- `[x]` 6.4 Dashboard tasks panel
- `[x]` 6.5 External sync (Todoist/Notion/Webhook)

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
- `[x]` 10.1 Rate-limiter & typing delay
- `[x]` 10.2 Message deduplication (unique key)
- `[x]` 10.3 Dead-letter queue + dashboard
- `[x]` 10.4 Users table & schema isolation
- `[x]` 10.5 JWT auth & middleware
- `[x]` 10.6 Log sanitisation
- `[x]` 10.7 Backup cron + restore docs
- `[x]` 10.8 Group chat reply toggle
- `[x]` 10.9 Media vision pipeline
- `[x]` 10.10 Status handling toggle
- `[x]` 10.11 Web dashboard switches for all new features

## Phase 11 – Daily Briefs & LLM Query Dashboard
- `[x]` 11.1 Data-gathering cron (unread, tasks, escalations)
- `[x]` 11.2 Summarization prompt + LLM call
- `[x]` 11.3 Brief storage & dashboard view
- `[x]` 11.4 Optional self-delivery to your WhatsApp
- `[x]` 11.5 Dashboard LLM query endpoint
- `[x]` 11.6 Query UI (natural-language about archive)

## Phase 12 – Hardening, Testing & Deployment
- `[x]` 12.1 Unit tests (sanitizer, DB helpers)
- `[x]` 12.2 Integration tests (queue → pipeline)
- `[x]` 12.3 E2E tests (database & rules)
- `[x]` 12.4 Security audit (auth, log sanitisation)
- `[x]` 12.5 Performance tuning (Redis, WAL mode, non-blocking)
- `[x]` 12.6 Documentation (README, API docs)
- `[x]` 12.7 Containerisation (Dockerfile)
- `[x]` 12.8 Production checklist & deployment

## Phase 13 – Web UI Master Polish & Advanced Production Features
- `[x]` 13.1 Performance at Scale: Virtualized message rendering with `react-virtuoso`
- `[x]` 13.2 Mobile & Responsive Layout: Mobile bottom drawer & swipe gestures
- `[x]` 13.3 Global State Management: Zustand store slices (chats, tasks, UI state)
- `[x]` 13.4 Toast Error Handling System: Sonner toasts & persistent dead-letter banner
- `[x]` 13.5 Backup & Restore UI: Drag-and-drop restore upload modal & API endpoint
- `[x]` 13.6 Auth & Multi-User Security: JWT authentication flow, login page & role checks
- `[x]` 13.7 Accessibility & ARIA Audit: ARIA labels, dialog roles & visible focus rings
- `[x]` 13.8 Multi-Language i18n Support: `react-i18next` translation framework & language dropdown
- `[x]` 13.9 UI Component Test Suite: Vitest + React Testing Library component coverage

