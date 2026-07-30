import { NextFunction, Response } from 'express';
import { ResponseService } from '../utils/response';
import { generateToken } from '../utils/helper';
import { IRequestUser } from './unifiedAuthMiddleware';
import { errorLogger } from '../utils/logger';
import { Database } from '../database';

export const generateOAuthToken = async (
  req: IRequestUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = req.user as any;
    if (!user) {
      ResponseService({
        data: null,
        status: 401,
        success: false,
        message: 'User not found',
        res,
      });
      return;
    }

    // Force session regeneration to clear any old serialized data
    if (req.session) {
      req.session.regenerate((err) => {
        if (err) {
          errorLogger(err, 'Session regeneration error');
        }
      });
    }
    const role = await Database.Role.findOne({ where: { id: user.roleId }, raw: true });
    if (!role) {
      ResponseService({
        data: null,
        status: 404,
        success: false,
        message: 'Role not found',
        res,
      });
      return;
    }

    const token = await generateToken({
      id: user.id,
      email: user.email,
      role: role.name,
      provider: 'google',
    });

    req.token = token;
    next();
  } catch (error) {
    const { message, stack } = error as Error;
    ResponseService({
      data: { message, stack },
      status: 500,
      success: false,
      res,
    });
  }
};
