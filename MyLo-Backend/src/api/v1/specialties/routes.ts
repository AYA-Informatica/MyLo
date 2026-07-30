import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { SpecialtyController } from './controller';
import { createSpecialtySchema, IdValidationSchema, updateSpecialtySchema } from './validators';

const specialtyRoutes = Router();
const controller = new SpecialtyController();

// GET /specialties
specialtyRoutes.get('/', controller.getAllSpecialties);

// GET /specialties/:id
specialtyRoutes.get(
  '/:id',
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.getSpecialty,
);

// POST /specialties
specialtyRoutes.post(
  '/',
  authMiddleware,
  ValidationMiddleware({ type: 'body', schema: createSpecialtySchema }),
  controller.createSpecialty,
);

// PATCH /specialties/:id
specialtyRoutes.patch(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateSpecialtySchema }),
  controller.updateSpecialty,
);

// DELETE /specialties/:id
specialtyRoutes.delete(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deleteSpecialty,
);

export default specialtyRoutes;