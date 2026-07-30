import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { UpvoteController } from './controller';
import { upvoteParamsValidationSchema, postIdValidationSchema } from './validators';

const upvoteRoutes = Router();
const controller = new UpvoteController();

// GET /posts/:postId/upvotes
upvoteRoutes.get(
  '/:postId/upvotes',
  ValidationMiddleware({ type: 'params', schema: postIdValidationSchema }),
  controller.getAllUpvotes,
);

// POST /posts/:postId/upvotes
upvoteRoutes.post(
  '/:postId/upvotes',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: postIdValidationSchema }),
  controller.createUpvote,
);

// DELETE /posts/:postId/upvotes/:upvoteId
upvoteRoutes.delete(
  '/:postId/upvotes/:upvoteId',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: upvoteParamsValidationSchema }),
  controller.deleteUpvote,
);

export default upvoteRoutes;
