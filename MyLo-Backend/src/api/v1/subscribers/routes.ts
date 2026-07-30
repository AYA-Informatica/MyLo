import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { checkRole } from '../../../middleware/ckeckRoleMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { AddEmailSchema, UnsubscribeTokenSchema, GetSubscribersQuerySchema } from './validators';
import { SubscriptionController } from './controller';

const subscriptionRoutes = Router();
const controller = new SubscriptionController();

// Public routes
subscriptionRoutes.post(
  '/',
  ValidationMiddleware({ type: 'body', schema: AddEmailSchema }),
  controller.subscribe,
);

subscriptionRoutes.get(
  '/unsubscribe',
  ValidationMiddleware({ type: 'query', schema: UnsubscribeTokenSchema }),
  controller.unsubscribe,
);

// Admin-only routes
subscriptionRoutes.get(
  '/',
  ValidationMiddleware({ type: 'query', schema: GetSubscribersQuerySchema }),
  controller.getSubscribers,
);

subscriptionRoutes.get(
  '/stats',
  authMiddleware,
  checkRole(['admin']),
  controller.getSubscriptionStats,
);

// Health check route for monitoring
subscriptionRoutes.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Subscription service is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default subscriptionRoutes;
