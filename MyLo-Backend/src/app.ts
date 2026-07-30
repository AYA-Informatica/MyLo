import express, { Request, Response, Express, NextFunction } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { corsOptions } from './middleware/corsMiddleware';
import helmet from 'helmet';
import { config } from 'dotenv';
import redis from './utils/redis'; // Assuming redis client setup is handled in this file
import router from './api/v1';
import { requestLogger, errorLogger } from './utils/logger';
import { swaggerRouter } from './swagger/router';
import passport from 'passport';
import { sessionMiddleware } from './utils/session'; // Assuming session setup is handled in this file
import parseForwarded from 'forwarded-parse';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

config();

const NUMBER_OF_PROXIES_TO_TRUST = 1;

const apiLimiter = rateLimit({
  keyGenerator: (req: Request) => {
    let ip = req.ip as string;
    try {
      const forwardedHeader = req.headers.forwarded;
      if (forwardedHeader) {
        const forwards = parseForwarded(forwardedHeader);

        if (forwards.length >= NUMBER_OF_PROXIES_TO_TRUST) {
          const mostTrustedProxyEntry = forwards[forwards.length - NUMBER_OF_PROXIES_TO_TRUST];
          
          if (mostTrustedProxyEntry?.for) {
            ip = mostTrustedProxyEntry.for;
          }
        }
      }
    } catch (ex) {
      errorLogger(ex as Error, `Error parsing Forwarded header from ${req.ip}:`);
    }
    return ipKeyGenerator(ip);
  },
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later.',
});


redis.connect().catch((err) => errorLogger(err, 'Redis Connection'));

export const createServer = (): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(morgan('production'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cors(corsOptions));
  app.use(helmet());

  app.set('views', 'views');
  app.set('view engine', 'ejs');

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.use((req: Request, res: Response, next: NextFunction) => {
    requestLogger(req);
    next();
  });

  app.get('/health', (req: Request, res: Response): void => {
    res.status(200).json({ status: 'OK' });
  });

  app.use(swaggerRouter);

  app.use('/api/v1', apiLimiter, router);

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      success: false,
      message: 'The requested resource was not found',
    });
  });

  return app;
};
