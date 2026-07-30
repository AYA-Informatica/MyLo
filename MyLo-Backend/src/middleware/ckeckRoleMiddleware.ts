import { Response, NextFunction } from 'express';
import { ResponseService } from '../utils/response';
import { Database } from '../database';
import { IRequestUser } from './unifiedAuthMiddleware';

export const checkRole =
  (roles: string[]) =>
  async (req: IRequestUser, res: Response, next: NextFunction): Promise<unknown> => {
    try {
      if (!req.user || !req.user.role) {
        return ResponseService({
          data: null,
          status: 403,
          success: false,
          message: 'Role information is missing',
          res,
        });
      }

      const userRole = await Database.Role.findOne({ where: { id: req.user.role }, raw: true });
      if (!userRole) {
        ResponseService({
          data: null,
          status: 403,
          success: false,
          message: 'Invalid role',
          res,
        });
        return;
      }
      if (!roles.includes(userRole.name)) {
        return ResponseService({
          data: null,
          status: 403,
          success: false,
          message: 'You do not have the required role to perform this action',
          res,
        });
      }
      next();
    } catch (error) {
      const { message } = error as Error;
      return ResponseService({
        data: { message },
        status: 500,
        success: false,
        message: 'Error checking role permissions',
        res,
      });
    }
  };
