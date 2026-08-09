# WA Assistant (AI Auto-Reply MVP) 🚀

WA Assistant is a highly intelligent, agentic WhatsApp assistant powered by Baileys, BullMQ, ChromaDB, and local LLMs (Ollama). 

It autonomously manages your WhatsApp conversations, intercepts messages, understands intent, schedules tasks, manages escalations, and extracts long-term memories to build a personalized AI persona that mimics you.

## Features ✨

- **Intent Classification**: Understands if a message is a greeting, a task request, a fact about the user, or something to ignore.
- **Long-term Memory**: Uses ChromaDB to embed facts and retrieve them into the LLM prompt.
- **Task Extraction**: Parses to-do items from natural conversation and tracks them in SQLite.
- **Escalation Protocol**: If the AI is unsure or dealing with sensitive data, it defers to the human and alerts the dashboard.
- **Voice Transcription**: Automatically intercepts voice notes, transcribes them, and seamlessly replies.
- **Disappearing Messages**: Automatically scrubs ephemeral messages from the database after an expiry period.
- **Web Search & Knowledge Base**: Queries the web for live facts and searches your custom injected knowledge base.
- **Daily Briefs**: Wakes up daily to summarize your pending tasks and active alerts.
- **Real-time Dashboard**: A beautiful React + Tailwind dashboard powered by WebSockets to monitor chats, tasks, alerts, and insights.
- **Secure Authentication**: JWT-based login with automatic admin bootstrapping.
- **Multi-Language (i18n)**: Fully internationalized frontend supporting instant English and Spanish toggling.
- **Accessibility (a11y)**: Screen-reader ready with ARIA labels, semantic roles, and visible focus rings.
- **Performance Optimized**: Uses virtualized lists (`react-virtuoso`) for massive chat histories and leverages lightweight 3B parameter models (Llama 3.2 3B / Qwen 2.5 3B) for sub-5 second response latency.

## Stack 🛠

- **Backend**: Node.js, Express, TypeScript, SQLite (better-sqlite3)
- **Queueing**: BullMQ + Redis
- **WhatsApp**: @whiskeysockets/baileys
- **AI**: llama-server (Llama 3.2 3B / Qwen 2.5 3B), ChromaDB
- **Frontend**: React, TailwindCSS, Vite, Zustand (State Management), Vitest (Testing)

## Prerequisites & Configuration ⚙️

Before starting the bot, you must provide the following:

1. **Environment Variables**: Copy `.env.example` to `.env` and fill in the required keys.
2. **AI Models**: Download a GGUF model (we recommend `Llama-3.2-3B-Instruct-uncensored-Q4_K_M.gguf` or `Qwen2.5-Omni-3B-UD-Q4_K_XL.gguf`) and place it in your `D:\models\` directory.
3. **Persona Setup**: Edit `config/prompts/main_persona.txt` to define your personality, tone, and texting style so the AI knows exactly how to impersonate you.

## Quickstart ⚡️

### 1. Start AI Server & Infrastructure
Ensure you have Docker installed for Redis and ChromaDB, and `llama.cpp` for the local LLM.

```bash
# Start Redis and ChromaDB
docker-compose up -d

# Start the local LLM in a separate terminal
./scripts/start_llama_server.bat
```

### 2. Start the Backend Worker & API
```bash
npm install
npm run dev
```
*On the first run, it will print a QR code in the terminal. Scan it with your WhatsApp app (Linked Devices) to authenticate.*

### 3. Start the Dashboard
Open a new terminal.
```bash
cd dashboard
npm install
npm run dev
```
*Navigate to http://localhost:5173 to view the dashboard.*

## Architecture

- **`src/baileys/`**: WhatsApp socket connection, authentication, and event emission.
- **`src/queue/`**: BullMQ producer and worker to ensure reliable message processing.
- **`src/pipeline/`**: The core AI brain (Classifier, LLM Client, Tasks, Memory, Escalation).
- **`src/db/`**: SQLite tables and ChromaDB vector store logic.
- **`src/api/`**: Express server exposing REST routes and WebSockets for the React dashboard.
- **`src/cron/`**: Background jobs for archiving, daily briefs, and backups.

## License
MIT
