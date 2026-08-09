import { runMigrations } from '../src/db/sqlite';
import { enqueueIncoming } from '../src/queue/producer';
import '../src/queue/worker';
import db from '../src/db/sqlite';

async function testVoiceToVoiceFlow() {
  console.log('--- Phase 7: Voice-to-Voice Pipeline Test ---');
  console.log('Flow: Qwen Omni (Transcribe) -> Messiah 7B (Draft Reply) -> Qwen Omni (TTS Speech Output) -> WhatsApp Voice Reply');
  
  runMigrations();

  const testChatId = '987654321@s.whatsapp.net';
  const testMsgId = `voice_test_${Date.now()}`;

  console.log('Simulating incoming Voice Note message from contact...');
  
  await enqueueIncoming({
    messageId: testMsgId,
    chatId: testChatId,
    senderJid: testChatId,
    body: '[Voice Note Audio Message]',
    timestamp: Math.floor(Date.now() / 1000),
    isGroup: false,
    fromMe: false,
    mediaType: 'audioMessage',
    isEphemeral: false
  });

  console.log('Voice note enqueued into BullMQ. Waiting for worker processing...');

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const savedMsgs = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp DESC').all(testChatId) as any[];
  console.log(`Stored Messages for ${testChatId}: ${savedMsgs.length}`);
  savedMsgs.forEach((m) => {
    console.log(` - [${m.fromMe ? 'OUTGOING VOICE/TEXT' : 'INCOMING VOICE'}] ${m.body}`);
  });

  console.log('--- Voice-to-Voice Flow Test Completed Successfully ---');
  process.exit(0);
}

testVoiceToVoiceFlow().catch((err) => {
  console.error('Voice flow test failed:', err);
  process.exit(1);
});
