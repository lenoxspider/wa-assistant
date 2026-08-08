import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import db from '../db/sqlite';
import { waEvents } from '../baileys/events';
import { sendMessage } from '../baileys/client';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const AUTH_TOKEN = process.env.API_TOKEN || 'secret-token';
app.use((req, res, next) => {
  const token = req.headers.authorization;
  if (token !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Chats
app.get('/api/chats', (req, res) => {
  try {
    const chats = db.prepare('SELECT * FROM chats ORDER BY lastActivity DESC').all();
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Messages
app.get('/api/chats/:id/messages', (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC LIMIT 50').all(req.params.id);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Reply
app.post('/api/chats/:id/reply', async (req, res) => {
  try {
    const { text } = req.body;
    await sendMessage(req.params.id, { text });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Rules
app.get('/api/rules/:id', (req, res) => {
  try {
    const rule = db.prepare('SELECT * FROM rules WHERE chatId = ?').get(req.params.id);
    res.json(rule || { autoReplyEnabled: 1 });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/rules/:id', (req, res) => {
  try {
    const { autoReplyEnabled, silenceDuration } = req.body;
    db.prepare('INSERT OR REPLACE INTO rules (chatId, autoReplyEnabled, silenceDuration) VALUES (?, ?, ?)')
      .run(req.params.id, autoReplyEnabled ? 1 : 0, silenceDuration || 0);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Escalations
app.get('/api/escalations', (req, res) => {
  try {
    const escalations = db.prepare('SELECT * FROM escalations WHERE resolvedBy IS NULL ORDER BY timestamp DESC').all();
    res.json(escalations);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/escalations/:id/resolve', (req, res) => {
  try {
    const { resolution } = req.body;
    db.prepare('UPDATE escalations SET resolvedBy = ?, resolution = ? WHERE id = ?')
      .run('admin', resolution || 'Resolved via dashboard', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Tasks
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY id DESC').all();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/tasks/:id/complete', (req, res) => {
  try {
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run('completed', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Knowledge Base
app.get('/api/knowledge', (req, res) => {
  try {
    const kb = db.prepare('SELECT id, category, content FROM knowledgebase ORDER BY id DESC').all();
    res.json(kb);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/knowledge', async (req, res) => {
  try {
    const { content, category } = req.body;
    const { addKnowledge } = await import('../pipeline/knowledge');
    await addKnowledge(content, category || 'general');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add knowledge' });
  }
});

// WebSockets
io.on('connection', (socket) => {
  console.log('Dashboard client connected');
});

waEvents.on('whatsapp:incoming', (msg) => {
  io.emit('new_message', msg);
});

export function emitEscalation(data: any) {
  io.emit('new_escalation', data);
}

export function startServer(port = 3001) {
  httpServer.listen(port, () => {
    console.log(`Dashboard API server running on port ${port}`);
  });
}
