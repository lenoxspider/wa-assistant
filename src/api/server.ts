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

// 4.8 Auth middleware (simple token)
const AUTH_TOKEN = process.env.API_TOKEN || 'secret-token';
app.use((req, res, next) => {
  const token = req.headers.authorization;
  if (token !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// 4.2 REST API routes
app.get('/api/chats', (req, res) => {
  try {
    const chats = db.prepare('SELECT * FROM chats ORDER BY lastActivity DESC').all();
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/chats/:id/messages', (req, res) => {
  try {
    const messages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp ASC LIMIT 50').all(req.params.id);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/chats/:id/reply', async (req, res) => {
  try {
    const { text } = req.body;
    await sendMessage(req.params.id, { text });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

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

// 4.3 WebSocket relay
io.on('connection', (socket) => {
  console.log('Dashboard client connected');
});

waEvents.on('whatsapp:incoming', (msg) => {
  io.emit('new_message', msg);
});

export function startServer(port = 3001) {
  httpServer.listen(port, () => {
    console.log(`Dashboard API server running on port ${port}`);
  });
}
