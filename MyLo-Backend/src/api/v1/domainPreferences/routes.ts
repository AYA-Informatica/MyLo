import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { DomainPreferenceController } from './controller';
import { 
  createProfileDomainPreferenceSchema, 
  IdValidationSchema, 
  updateProfileDomainPreferenceSchema, 
} from './validators';

const preferenceRoutes = Router();
const controller = new DomainPreferenceController();

// GET /preferences
preferenceRoutes.get('/', controller.getAllPreferences);

// GET /preferences/:id
preferenceRoutes.get(
  '/:id',
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.getPreference,
);

// POST /preferences
preferenceRoutes.post(
  '/',
  authMiddleware,
  ValidationMiddleware({ type: 'body', schema: createProfileDomainPreferenceSchema }),
  controller.createPreference,
);

// PATCH /preferences/:id
preferenceRoutes.patch(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateProfileDomainPreferenceSchema }),
  controller.updatePreference,
);

// DELETE /preferences/:id
preferenceRoutes.delete(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deletePreference,
);

export default preferenceRoutes;