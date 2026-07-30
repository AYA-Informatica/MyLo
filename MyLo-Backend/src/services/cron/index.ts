import cron from 'node-cron';
import { logger } from '../../utils/logger';

export const initCronJobs = ():void => {
  // Example
  cron.schedule('0 12 * * *', async () => {
    logger.info('[Cron] Executing scheduler');
  }, {
    timezone: 'UTC',
  });
  
  logger.info('[Cron] Job scheduled to run daily at 12:00 PM');
};
