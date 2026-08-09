import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const connection = new IORedis(redisOptions);

export const incomingQueue = new Queue('incoming-messages', { connection: redisOptions });
export const escalationQueue = new Queue('escalation-timer', { connection: redisOptions });

export { connection };
