import { Response } from 'express';
import { Database } from '../../../../database';
import { ResponseService } from '../../../../utils/response';
import {
  comparePassword,
  destroyToken,
  generateToken,
  hashPassword,
} from '../../../../utils/helper';
import { errorLogger, logger } from '../../../../utils/logger';
import { IRequestUser } from '../../../../middleware/unifiedAuthMiddleware';
import { CreateCitizenInterface, CreateOrganizationInterface } from '../../users/users';

export class AuthService {
  data: CreateCitizenInterface | CreateOrganizationInterface;
  token: string;
  res: Response;

  constructor(
    data: CreateCitizenInterface | CreateOrganizationInterface,
    res: Response,
    token: string,
  ) {
    this.data = data;
    this.res = res;
    this.token = token;
  }

  async citizenRegister(): Promise<void> {
    try {
      const { username, email, password } = this.data as CreateCitizenInterface;

      const role = await Database.Role.findOne({ where: { name: 'citizen' }, raw: true });
      if (!role) {
        ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Default role "citizen" not found',
          res: this.res,
        });
        return;
      }
      const userExist = await Database.User.findOne({ where: { email } });
      if (userExist) {
        ResponseService({
          data: null,
          status: 409,
          success: false,
          message: 'User already exists',
          res: this.res,
        });
        return;
      }

      const user = await Database.User.create({
        username: '@' + username,
        email,
        password: await hashPassword(password),
        roleId: role?.id,
        isActive: true,
      });

      ResponseService({
        data: user,
        message: 'User created successfully',
        success: true,
        status: 201,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async organizationRegister(): Promise<void> {
    try {
      const { name, email, address, registrationNumber, password } = this
        .data as CreateOrganizationInterface;

      const role = await Database.Role.findOne({ where: { name: 'organization' }, raw: true });
      if (!role) {
        ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Default role "organization" not found',
          res: this.res,
        });
        return;
      }
      const userExist = await Database.User.findOne({ where: { email } });
      if (userExist) {
        ResponseService({
          data: null,
          status: 409,
          success: false,
          message: 'User already exists',
          res: this.res,
        });
        return;
      }

      const user = await Database.User.create({
        name,
        email,
        address,
        registrationNumber,
        password: await hashPassword(password),
        roleId: role?.id,
        isActive: true,
      });

      ResponseService({
        data: user,
        message: 'User created successfully',
        success: true,
        status: 201,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async lawFirmRegister(): Promise<void> {
    try {
      const { name, email, address, registrationNumber, password } = this
        .data as CreateOrganizationInterface;

      const role = await Database.Role.findOne({ where: { name: 'law-firm' }, raw: true });
      if (!role) {
        ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Default role "law firm" not found',
          res: this.res,
        });
        return;
      }
      const userExist = await Database.User.findOne({ where: { email } });
      if (userExist) {
        ResponseService({
          data: null,
          status: 409,
          success: false,
          message: 'User already exists',
          res: this.res,
        });
        return;
      }

      const user = await Database.User.create({
        name,
        email,
        address,
        registrationNumber,
        password: await hashPassword(password),
        roleId: role?.id,
        isActive: true,
      });
      ResponseService({
        data: user,
        message: 'User created successfully',
        success: true,
        status: 201,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async login(): Promise<void> {
    try {
      const { email, password } = this.data;
      const user = await Database.User.findOne({ where: { email }, raw: true });
      if (!user) {
        ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'User not found',
          res: this.res,
        });
        return;
      }

      const role = await Database.Role.findOne({ where: { id: user.roleId }, raw: true });

      if (!role) {
        ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Role not found',
          res: this.res,
        });
        return;
      }

      const validPassword = await comparePassword(password, user.password);
      if (!validPassword) {
        ResponseService({
          data: null,
          status: 401,
          success: false,
          message: 'Invalid email or password',
          res: this.res,
        });

        return;
      }

      const token = await generateToken({ id: user.id, email: user.email, role: role.name });
      ResponseService({
        data: { token },
        status: 200,
        success: true,
        message: 'Login successful',
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async logout(req: IRequestUser, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const provider = req.user?.provider || 'unknown';
      const logoutPromises: Promise<unknown>[] = [];
      logger.info(`Starting logout for user ${userId} via ${provider} auth`);

      // Handle JWT token destruction (works with your existing system)
      if (req.token) {
        logger.info('Destroying JWT token');
        logoutPromises.push(destroyToken(req.token));
      }

      // Handle cookie-based JWT token
      if (req.cookies?.auth_token && req.cookies.auth_token !== req.token) {
        logger.info('Destroying cookie JWT token');
        logoutPromises.push(destroyToken(req.cookies.auth_token));
      }

      // Handle session-based logout (OAuth)
      if (req.logout && typeof req.logout === 'function') {
        logger.info('Destroying OAuth session');
        const sessionLogoutPromise = new Promise<void>((resolve, reject) => {
          req.logout((err) => {
            if (err) {
              errorLogger(err as Error, 'Session logout error:');
              reject(err);
            } else {
              resolve();
            }
          });
        });
        logoutPromises.push(sessionLogoutPromise);
      }

      // Handle session destruction
      if (req.session) {
        logger.info('Destroying Express session');
        const sessionDestroyPromise = new Promise<void>((resolve, reject) => {
          req.session.destroy((err) => {
            if (err) {
              errorLogger(err as Error, 'Session destroy error');
              reject(err);
            } else {
              resolve();
            }
          });
        });
        logoutPromises.push(sessionDestroyPromise);
      }

      // Wait for all logout operations
      const results = await Promise.allSettled(logoutPromises);

      // Check for any failures
      const failures: PromiseRejectedResult[] = results.filter(
        (result) => result.status === 'rejected',
      );
      if (failures.length > 0) {
        const error = new Error(
          `${failures.length} logout operations failed: ${failures.map((f) => f.reason).join(', ')}`,
        );
        errorLogger(error, 'Some logout operations failed');
      }

      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      res.clearCookie('connect.sid');

      logger.info(`User ${userId} logged out successfully`);

      ResponseService({
        data: null,
        status: 200,
        success: true,
        message: 'Logout successful',
        res,
      });
      return;
    } catch (error) {
      errorLogger(error as Error, 'Logout error');

      const { message, stack } = error as Error;
      ResponseService({
        data: process.env.NODE_ENV === 'production' ? { message, stack } : null,
        status: 500,
        success: false,
        message: 'Logout failed - please try again',
        res,
      });
      return;
    }
  }
}
