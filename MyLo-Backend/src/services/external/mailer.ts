import nodemailer from 'nodemailer';
import { config } from 'dotenv';
import ejs from 'ejs';
import path from 'path';
import { errorLogger, logger } from '../../utils/logger';
import { generateUnsubscribeToken } from '../../utils/helper';
config();

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

const sendMail = async (
  email: string,
  name: string,
  fileName: string,
  subject: string,
): Promise<void> => {
  try {
    const token = generateUnsubscribeToken(email);
    const unsubscribeLink = `${process.env.BASE_URL || 'http://localhost:5001'}/api/v1/subscribers/unsubscribe?token=${token}`;

    const templatePath = path.join(__dirname, '../../../views/email-templates', `${fileName}.ejs`);
    const viewsPath = path.join(__dirname, '../../../views');

    const html = await ejs.renderFile(
      templatePath,
      {
        name: name as string,
        email: email as string,
        unsubscribeLink,
      },
      {
        views: [viewsPath],
        async: true,
      },
    );

    const mailOptions = {
      from: `MenyaLo <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: subject as string,
      html,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email successfully sent to ${email}`);
  } catch (error) {
    errorLogger(error as Error, 'Error sending email:');
    throw error;
  }
};

// Enhanced bulk email function
const sendMailInBulk = async (
  emails: string[],
  fileName: string,
  subject: string,
): Promise<void> => {
  try {
    const templatePath = path.join(__dirname, '../../../views/email-templates', `${fileName}.ejs`);
    const viewsPath = path.join(__dirname, '../../../views');

    const html = await ejs.renderFile(
      templatePath,
      {},
      {
        views: [viewsPath],
        async: true,
      },
    );

    const mailOptions = {
      from: `MenyaLo <${process.env.SMTP_EMAIL}>`,
      bcc: emails,
      subject: subject as string,
      html,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Bulk email successfully sent to ${emails.length} recipients`);
  } catch (error) {
    errorLogger(error as Error, 'Error sending bulk email:');
    throw error;
  }
};

export { sendMail, sendMailInBulk };
