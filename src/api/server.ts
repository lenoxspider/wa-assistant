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

import path from 'path';
import fs from 'fs';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const upload = multer({ dest: path.resolve(process.cwd(), 'temp') });

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Bootstrap Admin
try {
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as {count: number};
  if (usersCount.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin', salt);
    db.prepare('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
    console.log('Bootstrapped default admin user');
  }
} catch (e) {
  // If table doesn't exist yet (migrations pending)
}

// Auth Router
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Protected routes middleware
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login') return next(); // Exclude login
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.REQUIRE_AUTH === 'false') return next(); // Opt-out path for dev
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
});

const dashboardDist = path.resolve(process.cwd(), 'dashboard', 'dist');
if (fs.existsSync(dashboardDist)) {
  app.use(express.static(dashboardDist));
}

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

// Briefs & Insights
app.get('/api/briefs', (req, res) => {
  try {
    const briefs = db.prepare('SELECT * FROM briefs ORDER BY id DESC LIMIT 5').all();
    res.json(briefs);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const { query } = req.body;
    const { queryMemory } = await import('../db/chroma');
    const { generateChatReply } = await import('../pipeline/llmClient');
    
    const memoryResults = await queryMemory(query, 5);
    const facts = memoryResults?.documents?.[0]?.join('\n') || '';
    
    const prompt = `You are a helpful assistant querying the user's personal WhatsApp archive.
Context found:
${facts}

User's query: "${query}"

Answer the query based ONLY on the context above. If you don't know, say so.`;
    
    const answer = await generateChatReply(prompt);
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: 'Query failed' });
  }
});

// Failed Queue / Dead-Letter API (Task 10.3)
app.get('/api/queue/failed', async (req, res) => {
  try {
    const { incomingQueue } = await import('../queue/connection');
    const failedJobs = await incomingQueue.getFailed();
    const formatted = failedJobs.map(j => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      timestamp: j.timestamp
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
});

app.post('/api/queue/retry-failed', async (req, res) => {
  try {
    const { incomingQueue } = await import('../queue/connection');
    const failedJobs = await incomingQueue.getFailed();
    for (const job of failedJobs) {
      await job.retry();
    }
    res.json({ success: true, count: failedJobs.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retry jobs' });
  }
});

// Dashboard Settings & Feature Switches (Task 10.11)
let appSettings = {
  respondInGroups: false,
  voiceOutputEnabled: true,
  autoReleaseTimerHours: 2,
  webSearchEnabled: true
};

app.get('/api/settings', (req, res) => {
  res.json(appSettings);
});

app.post('/api/settings', (req, res) => {
  appSettings = { ...appSettings, ...req.body };
  res.json({ success: true, settings: appSettings });
});

// Backup & Restore (Task 13.5)
app.post('/api/backup/restore', upload.single('backup'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'wa.db');
    const backupPath = `${dbPath}.bak`;

    // Backup current DB
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    // Replace with uploaded file
    fs.copyFileSync(req.file.path, dbPath);
    
    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, message: 'Database restored successfully! Please restart the server to apply changes.' });
  } catch (err) {
    console.error('Failed to restore backup:', err);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// Contact Persona & Memory Side-Sheet API
app.get('/api/contacts/:jid/persona', (req, res) => {
  try {
    const jid = req.params.jid;
    const personaRow = db.prepare('SELECT traitsJson FROM personas WHERE senderJid = ?').get(jid) as any;
    const traits = personaRow?.traitsJson ? JSON.parse(personaRow.traitsJson) : ["Casual", "Direct", "Tech-oriented", "Informal"];
    const memories = db.prepare('SELECT * FROM memories WHERE chatId = ? OR senderJid = ? ORDER BY id DESC LIMIT 10').all(jid, jid);
    res.json({ jid, traits, memories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contact persona' });
  }
});

app.post('/api/contacts/:jid/memories', (req, res) => {
  try {
    const { attribute, value } = req.body;
    db.prepare('INSERT INTO memories (chatId, senderJid, attribute, value, confidence) VALUES (?, ?, ?, ?, "1.0")')
      .run(req.params.jid, req.params.jid, attribute || 'fact', value);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add memory' });
  }
});

// Export Data Endpoint
app.get('/api/export', (req, res) => {
  try {
    const type = (req.query.type as string) || 'chats';
    if (type === 'tasks') {
      const data = db.prepare('SELECT * FROM tasks').all();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks_export.json');
      return res.send(JSON.stringify(data, null, 2));
    }
    if (type === 'briefs') {
      const data = db.prepare('SELECT * FROM briefs').all();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=briefs_export.json');
      return res.send(JSON.stringify(data, null, 2));
    }
    const data = db.prepare('SELECT * FROM messages ORDER BY timestamp DESC LIMIT 200').all();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=chats_export.json');
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
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
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is in use, failing over to port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}
