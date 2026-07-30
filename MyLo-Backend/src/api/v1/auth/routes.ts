import { Router } from 'express';
import { AuthController } from './local/controller';
import { ValidationMiddleware } from '../../../middleware/validationMiddleware';
import { createCitizenSchema, createOrganizationSchema, LoginUserSchema } from './local/validators';
import { authMiddleware } from '../../../middleware/unifiedAuthMiddleware';
import passport, { isGoogleOAuthEnabled } from '../../../config/passport';
import { generateOAuthToken } from '../../../middleware/oauthMiddleware';
import { googleCallBack } from './oauth/controller';

const authRoutes = Router();
const controller = new AuthController();

// Local Authentication routes
authRoutes.post(
  '/register/citizen',
  ValidationMiddleware({ type: 'body', schema: createCitizenSchema }),
  controller.citizenRegister,
);

authRoutes.post(
  '/register/organization',
  ValidationMiddleware({ type: 'body', schema: createOrganizationSchema }),
  controller.organizationRegister,
);

authRoutes.post(
  '/register/law-firm',
  ValidationMiddleware({ type: 'body', schema: createOrganizationSchema }),
  controller.lawFirmRegister,
);

authRoutes.post(
  '/login',
  ValidationMiddleware({ type: 'body', schema: LoginUserSchema }),
  controller.login,
);
authRoutes.post('/logout', authMiddleware, controller.logout);

// Google OAuth2 routes — only mounted when credentials are configured, so an
// unconfigured deployment answers with a clear 501 instead of an opaque
// "Unknown authentication strategy" failure from passport.
if (isGoogleOAuthEnabled) {
  authRoutes.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  authRoutes.get(
    '/google/redirect',
    passport.authenticate('google'),
    generateOAuthToken,
    googleCallBack,
  );
} else {
  authRoutes.get(['/google', '/google/redirect'], (_req, res) => {
    res.status(501).json({
      success: false,
      message: 'Google sign-in is not configured on this server. Use email and password instead.',
    });
  });
}

export default authRoutes;
