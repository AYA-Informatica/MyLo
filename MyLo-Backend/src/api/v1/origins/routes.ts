import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { OriginController } from './controller';
import { createOriginSchema, IdValidationSchema, updateOriginSchema } from './validators';

const originRoutes = Router();
const controller = new OriginController();

// GET /origins
originRoutes.get('/', controller.getAllOrigins);

// GET /origins/:id
originRoutes.get(
  '/:id',
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.getOrigin,
);

// POST /origins
originRoutes.post(
  '/',
  authMiddleware,
  ValidationMiddleware({ type: 'body', schema: createOriginSchema }),
  controller.createOrigin,
);

// PATCH /origins/:id
originRoutes.patch(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateOriginSchema }),
  controller.updateOrigin,
);

// DELETE /origins/:id
originRoutes.delete(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deleteOrigin,
);

export default originRoutes;
