import { Worker, Job } from 'bullmq';
import { connection } from './connection';
import { MessageEvent } from '../baileys/events';
import { processMessagePipeline } from '../pipeline/chatPipeline';

export const incomingWorker = new Worker('incoming-messages', async (job: Job<MessageEvent>) => {
  console.log(`Processing message: ${job.data.messageId}`);
  await processMessagePipeline(job.data);
}, { connection });

incomingWorker.on('completed', (job) => {
  console.log(`${job.id} has completed!`);
});

incomingWorker.on('failed', (job, err) => {
  console.error(`${job?.id} has failed with ${err.message}`);
});
