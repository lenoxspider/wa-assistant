import { EventEmitter } from 'events';
import { WAMessage, WAMessageUpdate } from '@whiskeysockets/baileys';

export interface MessageEvent {
  messageId: string;
  chatId: string;
  senderJid: string | null | undefined;
  body: string | null | undefined;
  timestamp: number | null | undefined;
  isGroup: boolean;
  fromMe: boolean;
  mediaType: string | null;
  isEphemeral: boolean;
  ephemeralExpiry?: number | null;
  rawEvent?: any;
  rawMessage?: any;
}

class WhatsAppEventEmitter extends EventEmitter {}
export const waEvents = new WhatsAppEventEmitter();
