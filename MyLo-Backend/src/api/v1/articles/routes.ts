import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { ArticleController } from './controller';
import {
  createArticleSchema,
  articleIdValidationSchema,
  updateArticleSchema,
  lawIdValidationSchema,
} from './validators';

const articleRoutes = Router({ mergeParams: true });
const controller = new ArticleController();

// GET /laws/:lawId/articles
articleRoutes.get(
  '/:lawId/articles/',
  ValidationMiddleware({ type: 'params', schema: lawIdValidationSchema }),
  controller.getAllArticles,
);

// GET /laws/:lawId/articles/:id
articleRoutes.get(
  '/:lawId/articles/:id',
  ValidationMiddleware({ type: 'params', schema: articleIdValidationSchema }),
  controller.getArticle,
);

// POST /laws/:lawId/articles
articleRoutes.post(
  '/:lawId/articles/',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: lawIdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: createArticleSchema }),
  controller.createArticle,
);

// PATCH /laws/:lawId/articles/:id
articleRoutes.patch(
  '/:lawId/articles/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: articleIdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateArticleSchema }),
  controller.updateArticle,
);

// DELETE /laws/:lawId/articles/:id
articleRoutes.delete(
  '/:lawId/articles/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: articleIdValidationSchema }),
  controller.deleteArticle,
);

export default articleRoutes;