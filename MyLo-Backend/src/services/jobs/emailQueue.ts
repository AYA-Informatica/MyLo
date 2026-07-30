import Bull from 'bull';
import { sendMailInBulk } from '../external/mailer';

interface EmailJobData {
  emails: string[];
  subject: string;
  template: string;
}
export const emailQueue = new Bull('emailQueue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  },
});

emailQueue.process((job) => {
  const { emails, subject, template } = job.data as EmailJobData;
  sendMailInBulk(emails, template, subject);
});
