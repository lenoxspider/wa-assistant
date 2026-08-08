import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { useSQLiteAuthState } from './auth';
import { waEvents } from './events';

export const logger = pino({ level: 'info' });
let sock: ReturnType<typeof makeWASocket> | null = null;

export async function initWhatsApp() {
  const { state, saveCreds } = useSQLiteAuthState();

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      logger.info('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
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

export async function sendMessage(jid: string, content: any) {
  if (!sock) throw new Error('Socket not initialized');
  
  if (content.text) {
    await sock.sendPresenceUpdate('composing', jid);
    const delay = Math.max(1000, Math.min(content.text.length * 30, 4000));
    await new Promise(resolve => setTimeout(resolve, delay));
    await sock.sendPresenceUpdate('paused', jid);
  }
  
  return sock.sendMessage(jid, content);
}
