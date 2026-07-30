import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { DomainController } from './controller';
import { createDomainSchema, IdValidationSchema, updateDomainSchema } from './validators';

const domainRoutes = Router();
const controller = new DomainController();

// GET /domains
domainRoutes.get('/', controller.getAllDomains);

// GET /domains/:id
domainRoutes.get(
  '/:id',
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.getDomain,
);

// POST /domains
domainRoutes.post(
  '/',
  authMiddleware,
  ValidationMiddleware({ type: 'body', schema: createDomainSchema }),
  controller.createDomain,
);

// PATCH /domains/:id
domainRoutes.patch(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateDomainSchema }),
  controller.updateDomain,
);

// DELETE /domains/:id
domainRoutes.delete(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deleteDomain,
);

export default domainRoutes;
