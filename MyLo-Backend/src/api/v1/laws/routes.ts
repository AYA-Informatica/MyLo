import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { LawController } from './controller';
import { createLawSchema, IdValidationSchema, updateLawSchema } from './validators';

const lawRoutes = Router();
const controller = new LawController();

// GET /laws
lawRoutes.get('/', controller.getAllLaws);

// GET /laws/:id
lawRoutes.get(
  '/:id',
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.getLaw,
);

// POST /laws
lawRoutes.post(
  '/',
  authMiddleware,
  ValidationMiddleware({ type: 'body', schema: createLawSchema }),
  controller.createLaw,
);

// PATCH /laws/:id
lawRoutes.patch(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateLawSchema }),
  controller.updateLaw,
);

// DELETE /laws/:id
lawRoutes.delete(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deleteLaw,
);

export default lawRoutes;