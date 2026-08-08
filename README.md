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

## Stack 🛠

- **Backend**: Node.js, Express, TypeScript, SQLite (better-sqlite3)
- **Queueing**: BullMQ + Redis
- **WhatsApp**: @whiskeysockets/baileys
- **AI**: Ollama (Llama 3 / Mistral), ChromaDB
- **Frontend**: React, TailwindCSS, Vite

## Quickstart ⚡️

### 1. Start Infrastructure (Redis & ChromaDB)
Ensure you have Docker installed.
```bash
docker-compose up -d
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
