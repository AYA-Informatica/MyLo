import { Router } from 'express';
import { RoleController } from './controller';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { checkRole } from '../../../middleware/ckeckRoleMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { createRoleSchema, updateRoleSchema } from './validators';

const roleRoutes = Router();
const controller = new RoleController();

roleRoutes.get('/', authMiddleware, controller.getAllRoles);
roleRoutes.get('/:id', authMiddleware, controller.getASingleRole);
roleRoutes.post(
  '/',
  authMiddleware,
  checkRole(['admin']),
  ValidationMiddleware({ type: 'body', schema: createRoleSchema }),
  controller.createRole,
);
roleRoutes.patch(
  '/:id',
  authMiddleware,
  checkRole(['admin']),
  ValidationMiddleware({ type: 'body', schema: updateRoleSchema }),
  controller.updateRole,
);
roleRoutes.delete('/:id', authMiddleware, checkRole(['admin']), controller.deleteRole);

export default roleRoutes;
