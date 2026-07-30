import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { RatingController } from './controller';
import {
  createRatingSchema,
  IdValidationSchema,
  updateRatingSchema,
  firmIdValidationSchema,
} from './validators';
import joi from 'joi';

const ratingRoutes = Router();
const controller = new RatingController();

// GET routes - public access for viewing ratings
ratingRoutes.get('/', controller.getAllRatings);
ratingRoutes.get(
  '/:id',
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.getARating,
);

// Routes for /profiles/:firmId/ratings
ratingRoutes.get(
  '/firm/:firmId',
  ValidationMiddleware({ type: 'params', schema: firmIdValidationSchema }),
  controller.getAllRatings,
);

// POST route - create rating (auth required)
ratingRoutes.post(
  '/',
  authMiddleware,
  ValidationMiddleware({ type: 'body', schema: createRatingSchema }),
  controller.createRating,
);

// Alternative nested route for creating ratings under profiles
ratingRoutes.post(
  '/firm/:firmId',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: firmIdValidationSchema }),
  ValidationMiddleware({
    type: 'body',
    schema: joi.object({
      star: joi.number().integer().min(1).max(5).required(),
      review: joi.string().optional(),
    }),
  }),
  controller.createRating,
);

// PATCH route - update rating (auth required, user can only update their own)
ratingRoutes.patch(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateRatingSchema }),
  controller.updateRating,
);

// DELETE route - delete rating (auth required, user can only delete their own)
ratingRoutes.delete(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deleteRating,
);

export default ratingRoutes;
