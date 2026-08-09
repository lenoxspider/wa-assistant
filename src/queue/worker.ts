import { Worker, Job } from 'bullmq';
import { redisOptions } from './connection';
import { MessageEvent } from '../baileys/events';
import { processMessagePipeline } from '../pipeline/chatPipeline';
import { downloadVoice, transcribeAudio } from '../pipeline/voice';
import db from '../db/sqlite';

export const incomingWorker = new Worker('incoming-messages', async (job: Job<MessageEvent>) => {
  console.log(`Processing message: ${job.data.messageId}`);
  
  if (job.data.mediaType === 'audioMessage' && job.data.rawEvent) {
    try {
      const audioPath = await downloadVoice(job.data.rawEvent);
      const transcript = await transcribeAudio(audioPath);
      job.data.body = transcript;
    } catch (err) {
      console.error('Transcription failed:', err);
      job.data.body = '[Voice message received, but transcription failed]';
    }
  }
  
  await processMessagePipeline(job.data);
}, { connection: redisOptions });

incomingWorker.on('completed', (job) => {
  console.log(`${job.id} has completed!`);
});

incomingWorker.on('failed', (job, err) => {
  console.error(`${job?.id} has failed with ${err?.message}`);
});

export const escalationWorker = new Worker('escalation-timer', async (job: Job<{ escalationId: number, chatId: string }>) => {
  const { escalationId, chatId } = job.data;
  console.log(`Evaluating auto-release timer for escalation #${escalationId} in chat ${chatId}...`);

  try {
    const esc = db.prepare('SELECT * FROM escalations WHERE id = ? AND resolvedBy IS NULL').get(escalationId) as any;
    if (esc) {
      console.log(`Auto-releasing unresolved escalation #${escalationId} for chat ${chatId}`);
      db.prepare('UPDATE escalations SET resolvedBy = ?, resolution = ? WHERE id = ?')
        .run('auto-release-timer', 'Auto-released by background timer', escalationId);
      
      // Re-enable auto reply for the chat
      db.prepare('INSERT OR REPLACE INTO rules (chatId, autoReplyEnabled) VALUES (?, 1)').run(chatId);
    } else {
      console.log(`Escalation #${escalationId} was already resolved. Auto-release timer skipped.`);
    }
  } catch (err) {
    console.error('Error in escalation auto-release worker:', err);
  }
}, { connection: redisOptions });
