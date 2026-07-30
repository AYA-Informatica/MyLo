import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { ReplyController } from './controller';
import {
  createReplySchema,
  updateReplySchema,
  replyParamsValidationSchema,
  nestedReplyParamsValidationSchema,
} from './validators';

const replyRoutes = Router();
const controller = new ReplyController();

// GET /posts/:postId/comments/:commentId/replies
replyRoutes.get(
  '/:postId/comments/:commentId/replies',
  ValidationMiddleware({ type: 'params', schema: nestedReplyParamsValidationSchema }),
  controller.getAllReplies,
);

// GET /posts/:postId/comments/:commentId/replies/:replyId
replyRoutes.get(
  '/:postId/comments/:commentId/replies/:replyId',
  ValidationMiddleware({ type: 'params', schema: replyParamsValidationSchema }),
  controller.getAReply,
);

// POST /posts/:postId/comments/:commentId/replies
replyRoutes.post(
  '/:postId/comments/:commentId/replies',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: nestedReplyParamsValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: createReplySchema }),
  controller.createReply,
);

// PATCH /posts/:postId/comments/:commentId/replies/:replyId
replyRoutes.patch(
  '/:postId/comments/:commentId/replies/:replyId',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: replyParamsValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateReplySchema }),
  controller.updateReply,
);

// DELETE /posts/:postId/comments/:commentId/replies/:replyId
replyRoutes.delete(
  '/:postId/comments/:commentId/replies/:replyId',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: replyParamsValidationSchema }),
  controller.deleteReply,
);

export default replyRoutes;
