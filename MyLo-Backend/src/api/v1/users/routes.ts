import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { UserController } from './controller';
import { updateUserSchema, IdValidationSchema } from './validators';

const userRoutes = Router();
const controller = new UserController();

// GET routes
userRoutes.get('/', controller.getAllUsers);
userRoutes.get('/citizens', controller.getAllCitizens);
userRoutes.get('/organizations', controller.getAllOrganizations);
userRoutes.get('/law-firms', controller.getAllLawFirms);
userRoutes.get(
  '/:id',
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.getAUser,
);

userRoutes.patch(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateUserSchema }),
  controller.updateUser,
);

userRoutes.delete(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deleteUser,
);

export default userRoutes;
