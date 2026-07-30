import { Router } from 'express';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { ProfileController } from './controller';
import {
  createCitizenProfileSchema,
  createOrganizationProfileSchema,
  createLawFirmProfileSchema,
  updateCitizenProfileSchema,
  updateOrganizationProfileSchema,
  updateLawFirmProfileSchema,
  IdValidationSchema,
} from './validators';
import { imageUpload } from '../../../utils/upload';

const profileRoutes = Router();
const controller = new ProfileController();
const upload = imageUpload;

// GET routes - public access for browsing profiles
profileRoutes.get('/', controller.getAllProfiles.bind(controller));
profileRoutes.get('/citizens', controller.getAllCitizenProfiles.bind(controller));
profileRoutes.get('/organizations', controller.getAllOrganizationProfiles.bind(controller));
profileRoutes.get('/law-firms', controller.getAllLawFirmProfiles.bind(controller));
profileRoutes.get(
  '/:id',
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.getAProfile.bind(controller),
);

// POST routes - role-specific profile creation (auth required)
profileRoutes.post(
  '/citizen',
  authMiddleware,
  ValidationMiddleware({ type: 'body', schema: createCitizenProfileSchema }),
  controller.createProfile.bind(controller),
);

profileRoutes.post(
  '/organization',
  authMiddleware,
  ValidationMiddleware({ type: 'body', schema: createOrganizationProfileSchema }),
  controller.createProfile.bind(controller),
);

profileRoutes.post(
  '/law-firm',
  authMiddleware,
  ValidationMiddleware({ type: 'body', schema: createLawFirmProfileSchema }),
  controller.createProfile.bind(controller),
);

// PATCH routes - role-specific profile updates (auth required)
profileRoutes.patch(
  '/:id/citizen',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateCitizenProfileSchema }),
  controller.updateProfile.bind(controller),
);

profileRoutes.patch(
  '/:id/organization',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateOrganizationProfileSchema }),
  controller.updateProfile.bind(controller),
);

profileRoutes.patch(
  '/:id/law-firm',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  ValidationMiddleware({ type: 'body', schema: updateLawFirmProfileSchema }),
  controller.updateProfile.bind(controller),
);

// Image upload routes (auth required, multipart/form-data)
profileRoutes.post(
  '/:id/image',
  authMiddleware,
  upload.single('image'),
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.uploadProfileImage.bind(controller),
);

profileRoutes.delete(
  '/:id/image',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deleteProfileImage.bind(controller),
);

// DELETE route - requires authentication
profileRoutes.delete(
  '/:id',
  authMiddleware,
  ValidationMiddleware({ type: 'params', schema: IdValidationSchema }),
  controller.deleteProfile.bind(controller),
);

export default profileRoutes;