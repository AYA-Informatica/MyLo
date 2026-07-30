import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { CommentController } from './controller';
import { createCommentSchema, IdValidationSchema, updateCommentSchema } from './validators';

const commentRoutes = Router();
const controller = new CommentController();

commentRoutes.get('/:postId/comments', controller.getAllComments);
commentRoutes.get(
  '/:postId/comments/:id',
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.getAComment,
);
commentRoutes.post(
  '/:postId/comments/',
  authMiddleware,
  ValidationMiddleware({ type: 'body', schema: createCommentSchema }),
  controller.createComment,
);
commentRoutes.patch(
  '/:postId/comments/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateCommentSchema }),
  controller.updateComment,
);
commentRoutes.delete(
  '/:postId/comments/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deleteComment,
);

export default commentRoutes;
