import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { PostController } from './controller';
import { createPostSchema, IdValidationSchema, updatePostSchema } from './validators';
import { imageUpload } from '../../../utils/upload';

const postRoutes = Router();
const controller = new PostController();
const upload = imageUpload;

postRoutes.get('/', controller.getAllPosts);
postRoutes.get(
  '/:id',
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.getAPost,
);
postRoutes.post(
  '/',
  authMiddleware,
  upload.single('image'),
  ValidationMiddleware({ type: 'body', schema: createPostSchema }),
  controller.createPost,
);
postRoutes.patch(
  '/:id',
  authMiddleware,
  upload.single('image'),
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updatePostSchema }),
  controller.updatePost,
);
postRoutes.delete(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deletePost,
);

export default postRoutes;
