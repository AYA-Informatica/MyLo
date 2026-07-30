import { ResponseService } from '../../../utils/response';
import { Response } from 'express';
import { Database } from '../../../database';
import { sendMail } from '../../../services/external/mailer';
import jwt from 'jsonwebtoken';
import { errorLogger } from '../../../utils/logger';
import { Op } from 'sequelize';

export class SubscriptionService {
  email: string;
  token: string;
  res: Response;

  constructor(email: string, token: string, res: Response) {
    this.email = email;
    this.token = token;
    this.res = res;
  }

  async subscribe(): Promise<void> {
    try {
      if (!this.email) {
        ResponseService({
          data: null,
          status: 400,
          success: false,
          message: 'Email is required',
          res: this.res,
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        ResponseService({
          data: null,
          status: 400,
          success: false,
          message: 'Please provide a valid email address',
          res: this.res,
        });
        return;
      }

      const userName = await Database.User.findOne({
        where: { email: this.email },
        raw: true,
      });

      const subscriber = await Database.Subscriber.findOne({
        where: { email: this.email },
        paranoid: false,
        raw: true,
      });

      const displayName = userName?.username || userName?.name || 'Friend';

      if (subscriber?.subscribed === false) {
        // Reactivate existing unsubscribed user
        await Database.Subscriber.update({ subscribed: true }, { where: { email: this.email } });

        await sendMail(this.email, displayName, 'resubscribed', 'Welcome back to Menyalo');

        ResponseService({
          data: { email: this.email, subscribed: true },
          status: 200,
          success: true,
          message: 'Successfully resubscribed! Welcome back.',
          res: this.res,
        });
      } else if (subscriber?.subscribed === true) {
        // User is already subscribed
        await sendMail(
          this.email,
          displayName,
          'existing-subscriber',
          'You are already a cherished member of Menyalo',
        );

        ResponseService({
          data: { email: this.email, subscribed: true },
          status: 200,
          success: true,
          message: 'You are already subscribed to our newsletter.',
          res: this.res,
        });
      } else {
        // Create new subscription
        const newSubscriber = await Database.Subscriber.create({
          email: this.email,
          subscribed: true,
        });

        await sendMail(this.email, displayName, 'subscribe', 'Welcome to Menyalo - You are in!');

        ResponseService({
          data: {
            id: newSubscriber.id,
            email: newSubscriber.email,
            subscribed: true,
          },
          status: 201,
          success: true,
          message: 'Successfully subscribed! Welcome to Menyalo.',
          res: this.res,
        });
      }
    } catch (error) {
      errorLogger(error as Error, 'Subscription error.');
      const { message, stack } = error as Error;
      ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        message: 'An error occurred while processing your subscription. Please try again.',
        res: this.res,
      });
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      if (!this.token) {
        ResponseService({
          data: null,
          success: false,
          status: 400,
          message: 'Unsubscribe token is required.',
          res: this.res,
        });
        return;
      }

      const decoded = jwt.verify(this.token as string, process.env.JWT_SECRET!) as {
        email: string;
      };

      const email = decoded.email;

      // Check if subscriber exists
      const subscriber = await Database.Subscriber.findOne({
        where: { email },
        raw: true,
      });

      if (!subscriber) {
        ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Subscription not found.',
          res: this.res,
        });
        return;
      }

      if (subscriber.subscribed === false) {
        ResponseService({
          data: { email },
          status: 200,
          success: true,
          message: 'You are already unsubscribed.',
          res: this.res,
        });
        return;
      }

      // Update subscription status
      await Database.Subscriber.update({ subscribed: false }, { where: { email } });

      const userName = await Database.User.findOne({
        where: { email: email as string },
        raw: true,
      });

      const displayName = userName?.username || userName?.name || 'Friend';

      ResponseService({
        data: { email },
        status: 200,
        success: true,
        message: 'Successfully unsubscribed from Menyalo.',
        res: this.res,
      });

      sendMail(email, displayName, 'unsubscribe', 'You have been unsubscribed from Menyalo').catch(
        (error) => {
          errorLogger(error as Error, 'Error sending unsubscribe confirmation email.');
        },
      );
    } catch (error) {
      errorLogger(error as Error, 'Unsubscribe error.');
      const { message, stack } = error as Error;
      ResponseService({
        data: { message, stack },
        success: false,
        status: 400,
        message: 'Invalid or expired unsubscribe link. Please try again or contact support.',
        res: this.res,
      });
    }
  }

  async getSubscribers(page = 1, limit = 50, search?: string): Promise<void> {
    try {
      const offset = (page - 1) * limit;

      const whereClause: Record<string, unknown> = { subscribed: true };

      if (search) {
        whereClause.email = {
          [Op.iLike]: `%${search}%`, // PostgreSQL case-insensitive search
        };
      }

      const { count, rows: subscribers } = await Database.Subscriber.findAndCountAll({
        where: whereClause,
        attributes: ['id', 'email', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        raw: true,
      });

      const totalPages = Math.ceil(count / limit);

      ResponseService({
        data: {
          subscribers,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: count,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
        status: 200,
        success: true,
        message:
          count > 0
            ? `Found ${count} active subscriber${count !== 1 ? 's' : ''}`
            : 'No active subscribers found',
        res: this.res,
      });
    } catch (error) {
      errorLogger(error as Error, 'Get subscribers error.');
      const { message, stack } = error as Error;
      ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        message: 'An error occurred while retrieving subscribers.',
        res: this.res,
      });
    }
  }
}
