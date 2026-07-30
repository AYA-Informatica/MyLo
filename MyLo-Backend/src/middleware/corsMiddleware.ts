import cors from 'cors';
import { allowedOrigins } from '../config/allowedOrigins';
import { logger } from '../utils/logger';

export const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    logger.info('Request origin:', origin);

    if (origin === undefined || origin === null) {
      logger.info('Allowing undefined/null origin (server-to-server, mobile app, etc.)');
      return callback(null, true);
    }
    if (origin === '') {
      logger.info('Allowing empty string origin');
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      logger.info('Origin allowed:', origin);
      return callback(null, true);
    }
    logger.info('CORS blocked origin:', origin);
    callback(new Error(`Origin "${origin}" not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
