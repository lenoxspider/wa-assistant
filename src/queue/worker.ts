import { Worker, Job } from 'bullmq';
import { connection } from './connection';
import { MessageEvent } from '../baileys/events';
import { processMessagePipeline } from '../pipeline/chatPipeline';
import { downloadVoice, transcribeAudio } from '../pipeline/voice';

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
}, { connection });

incomingWorker.on('completed', (job) => {
  console.log(`${job.id} has completed!`);
});

incomingWorker.on('failed', (job, err) => {
  console.error(`${job?.id} has failed with ${err.message}`);
});
