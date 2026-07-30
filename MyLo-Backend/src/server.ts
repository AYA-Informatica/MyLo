import { createServer } from './app';
import { Database } from './database';
import { errorLogger, logStartup } from './utils/logger';
import { initCronJobs } from './services/cron';
import { config } from 'dotenv';
config();

const server = createServer();
const port = parseInt(process.env.PORT as string) || 5001;
const env = process.env.NODE_ENV as string;

Database.database
  .authenticate()
  .then(async () => {
    try {
      initCronJobs();
      server.listen(port, '0.0.0.0', () => {
        logStartup(port, env);
      });
    } catch (error) {
      errorLogger(error as Error, 'Server Startup');
    }
  })
  .catch((error) => {
    errorLogger(error as Error, 'Database Connection');
  });
