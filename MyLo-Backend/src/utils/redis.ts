import { createClient } from 'redis';
import { logger } from './logger';
import { config } from 'dotenv';
config();

const host = process.env.REDIS_HOST;
const port = parseInt(process.env.REDIS_PORT as string);
const database = process.env.REDIS_DB as string;

const redis = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT as string),
  },
});

logger.info(`Redis configuration: ${host}:${port}, DB:${database}`);

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error(`Redis connection error: ${err.message}`, { stack: err.stack });
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

export default redis;
