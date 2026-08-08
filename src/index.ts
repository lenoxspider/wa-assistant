import { initWhatsApp } from './baileys/client';
import { waEvents } from './baileys/events';
import { enqueueIncoming } from './queue/producer';
import { runMigrations } from './db/sqlite';
import { startServer } from './api/server';
import { startArchiverCron } from './cron/archiver';

async function bootstrap() {
  console.log('Running DB migrations...');
  runMigrations();

  console.log('Connecting to WhatsApp...');
  await initWhatsApp();

  // Route events to queue
  waEvents.on('whatsapp:incoming', (msgObj) => {
    enqueueIncoming(msgObj);
  });
  
  // Start Dashboard server
  startServer(3001);

  // Start Background Jobs
  startArchiverCron();

  console.log('System is running!');
}

bootstrap().catch(console.error);
