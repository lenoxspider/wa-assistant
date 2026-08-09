import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { useSQLiteAuthState } from './auth';
import { waEvents } from './events';

export const logger = pino({ level: 'info' });
let sock: ReturnType<typeof makeWASocket> | null = null;

export async function initWhatsApp() {
  const { state, saveCreds } = useSQLiteAuthState();

  sock = makeWASocket({
    auth: state,
    logger,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n--- SCAN THIS WHATSAPP QR CODE ---');
      qrcode.generate(qr, { small: true });
      console.log('----------------------------------\n');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      logger.info({ error: lastDisconnect?.error, shouldReconnect }, 'connection closed due to error');
      if (shouldReconnect) {
        setTimeout(initWhatsApp, 5000); // 5s backoff
      }
    } else if (connection === 'open') {
      logger.info('opened connection');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    for (const msg of messages) {
      if (!msg.message) continue;
      
      const chatId = msg.key.remoteJid;
      if (!chatId) continue;
      
      const isGroup = chatId.endsWith('@g.us');
      const senderJid = isGroup ? msg.key.participant : chatId;
      
      const textMessage = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      const mediaType = Object.keys(msg.message).find(k => k.endsWith('Message')) || null;
      
      const isEphemeral = !!msg.message?.ephemeralMessage;
      let body = textMessage;
      
      if (isEphemeral && msg.message.ephemeralMessage?.message) {
         const ephMsg = msg.message.ephemeralMessage.message;
         body = ephMsg.conversation || ephMsg.extendedTextMessage?.text;
      }

      waEvents.emit('whatsapp:incoming', {
        messageId: msg.key.id,
        chatId,
        senderJid,
        body,
        timestamp: msg.messageTimestamp,
        isGroup,
        fromMe: !!msg.key.fromMe,
        mediaType,
        isEphemeral,
        rawEvent: msg
      });
    }
  });

  return sock;
}

import db from '../db/sqlite';

export async function sendMessage(jid: string, content: any) {
  if (!sock) {
    logger.info({ jid, content }, 'Socket not initialized. Simulating message send.');
    try {
      db.prepare('INSERT OR REPLACE INTO messages (messageId, chatId, senderJid, body, timestamp, fromMe) VALUES (?, ?, ?, ?, ?, 1)')
        .run(`out_${Date.now()}`, jid, 'me', content.text || '', Math.floor(Date.now() / 1000));
    } catch(e) {}
    return;
  }
  
  if (content.text) {
    await sock.sendPresenceUpdate('composing', jid);
    const delay = Math.max(1000, Math.min(content.text.length * 30, 4000));
    await new Promise(resolve => setTimeout(resolve, delay));
    await sock.sendPresenceUpdate('paused', jid);
  } else if (content.audio) {
    await sock.sendPresenceUpdate('recording', jid);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await sock.sendPresenceUpdate('paused', jid);
  }
  
  return sock.sendMessage(jid, content);
}
