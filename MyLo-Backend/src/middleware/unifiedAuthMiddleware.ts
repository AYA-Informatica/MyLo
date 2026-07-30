import { Request, Response, NextFunction } from 'express';
import { ResponseService } from '../utils/response';
import { verifyToken } from '../utils/helper';
import { errorLogger, logger } from '../utils/logger';

interface JwtPayload {
  id?: string;
  email?: string;
  role?: string;
  permissions?: string[];
  provider?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface IRequestUser extends Request {
  user?: JwtPayload;
  token?: string;
}

export const authMiddleware = async (
  req: IRequestUser,
  res: Response,
  next: NextFunction,
): Promise<unknown> => {
  try {
    // Check for JWT token in Authorization header
    const { authorization } = req.headers;

    if (authorization && authorization.startsWith('Bearer ')) {
      const token = authorization.split(' ')[1];

      if ((!token && token === 'null') || token === 'undefined') {
        return ResponseService({
          data: null,
          status: 401,
          success: false,
          message: 'Authentication token is missing',
          res,
        });
      } else {
        try {
          const decoded = (await verifyToken(token)) as JwtPayload;
          req.user = {
            ...decoded,
            provider: decoded.provider || 'local',
          };
          req.token = token;
          return next();
        } catch (jwtError) {
          const errorMessage = jwtError instanceof Error ? jwtError.message : 'Unknown JWT error';
          logger.warn(`JWT verification failed: ${errorMessage}`);
        }
      }
    }

    // Check for session-based auth (OAuth)
    if (req.isAuthenticated && typeof req.isAuthenticated === 'function') {
      try {
        const isAuth = req.isAuthenticated();
        if (isAuth && req.user) {
          const sessionUser = req.user;

          if (sessionUser && sessionUser.id) {
            req.user = {
              id: sessionUser.id.toString(),
              email: sessionUser.email,
              role: sessionUser.role || 'citizen',
              provider: sessionUser.provider || 'google',
              jti: 'session', // Session-based auth doesn't have JTI
            };
            return next();
          }
        }
      } catch (sessionError) {
        errorLogger(sessionError as Error, 'Session authentication check failed:');
      }
    }

    // Check for cookie-based JWT token (OAuth callback)
    if (req.cookies?.auth_token) {
      try {
        const cookieToken = req.cookies.auth_token;
        const decoded = await verifyToken(cookieToken);

        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          provider: decoded.provider || 'google',
          jti: decoded.jti,
        };
        req.token = cookieToken;
        return next();
      } catch (cookieError) {
        errorLogger(cookieError as Error, 'Cookie token verification failed:');
        res.clearCookie('auth_token');
      }
    }
    ResponseService<null>({
      data: null,
      res,
      success: false,
      message: 'Unauthorized Access - Please login',
      status: 401,
    });
    return;
  } catch (error) {
    errorLogger(error as Error, 'unifiedAuthMiddleware error:');
    ResponseService({
      res,
      success: false,
      data: null,
      message: 'Authentication error occurred',
      status: 500,
    });
    return;
  }
};
