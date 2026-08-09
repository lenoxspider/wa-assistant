import { runMigrations } from '../src/db/sqlite';
import { enqueueIncoming } from '../src/queue/producer';
import '../src/queue/worker';
import db from '../src/db/sqlite';

async function runPipelineTest() {
  console.log('--- Phase 1.6: Basic Auto-Reply Pipeline Test ---');
  
  // 1. Ensure migrations run
  runMigrations();

  const testChatId = '123456789@s.whatsapp.net';
  const testMessageId = `test_msg_${Date.now()}`;
  const testText = 'Hello! I am checking in to confirm our project meeting tomorrow.';

  console.log(`Simulating incoming message from ${testChatId}...`);

  // 2. Enqueue simulated message
  await enqueueIncoming({
    messageId: testMessageId,
    chatId: testChatId,
    senderJid: testChatId,
    body: testText,
    timestamp: Math.floor(Date.now() / 1000),
    isGroup: false,
    fromMe: false,
    mediaType: null,
    isEphemeral: false
  });

  console.log('Message enqueued into BullMQ. Waiting for worker processing...');

  // Wait 3 seconds for worker execution
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Check messages table in SQLite
  const savedMessages = db.prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY timestamp DESC').all(testChatId) as any[];
  console.log(`Messages stored in SQLite for ${testChatId}: ${savedMessages.length}`);
  savedMessages.forEach((m) => {
    console.log(` - [${m.fromMe ? 'OUTGOING' : 'INCOMING'}] ${m.body}`);
  });

  console.log('--- Test Completed Successfully ---');
  process.exit(0);
}

runPipelineTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
