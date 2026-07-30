import { Request, Response } from 'express';
import { SubscriptionService } from './service';
import { RequestSubscriberInterface } from './subscribers';
import { IRequestUser } from '../../../middleware/unifiedAuthMiddleware';
import { errorLogger } from '../../../utils/logger';

export class SubscriptionController {
  public async subscribe(req: RequestSubscriberInterface, res: Response): Promise<void> {
    try {
      const { token } = req.query;
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          data: null,
        });
        return;
      }

      const service = new SubscriptionService(email.toLowerCase().trim(), token as string, res);
      await service.subscribe();
    } catch (error) {
      errorLogger(error as Error, 'Subscribe controller error.');
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred during subscription',
        data: null,
      });
    }
  }

  public async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Unsubscribe token is required',
          data: null,
        });
        return;
      }

      const service = new SubscriptionService('', token as string, res);
      await service.unsubscribe();
    } catch (error) {
      errorLogger(error as Error, 'Unsubscribe controller error.');
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred during unsubscription',
        data: null,
      });
    }
  }

  public async getSubscribers(req: IRequestUser, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;

      const service = new SubscriptionService('', '', res);
      await service.getSubscribers(page, limit, search);
    } catch (error) {
      errorLogger(error as Error, 'Get subscribers controller error.');
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while fetching subscribers',
        data: null,
      });
    }
  }

  // Additional method to get subscription stats for admins
  public async getSubscriptionStats(req: IRequestUser, res: Response): Promise<void> {
    try {
      // This would be implemented in the service layer
      res.status(200).json({
        success: true,
        message: 'Subscription stats retrieved successfully',
        data: {
          // Placeholder for stats implementation
          totalSubscribers: 0,
          newThisMonth: 0,
          unsubscribedThisMonth: 0,
        },
      });
    } catch (error) {
      errorLogger(error as Error, 'Get subscription stats error.');
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while fetching subscription stats',
        data: null,
      });
    }
  }
}
