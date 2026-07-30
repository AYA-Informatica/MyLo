import { Response } from 'express';
import { AuthService } from './service';
import { IRequestUser } from '../../../../middleware/unifiedAuthMiddleware';

export class AuthController {
  public citizenRegister(req: IRequestUser, res: Response): void {
    try {
      const token = req.token as string;
      const authService = new AuthService(req.body, res, token);
      authService.citizenRegister();
    } catch (error) {
      throw error as Error;
    }
  }
  public organizationRegister(req: IRequestUser, res: Response): void {
    try {
      const token = req.token as string;
      const authService = new AuthService(req.body, res, token);
      authService.organizationRegister();
    } catch (error) {
      throw error as Error;
    }
  }
  public lawFirmRegister(req: IRequestUser, res: Response): void {
    try {
      const token = req.token as string;
      const authService = new AuthService(req.body, res, token);
      authService.lawFirmRegister();
    } catch (error) {
      throw error as Error;
    }
  }
  public login(req: IRequestUser, res: Response): void {
    try {
      const token = req.token as string;
      const authService = new AuthService(req.body, res, token);
      authService.login();
    } catch (error) {
      throw error as Error;
    }
  }
  public logout(req: IRequestUser, res: Response): void {
    try {
      const token = req.token as string;
      const authService = new AuthService(req.body, res, token);
      authService.logout(req, res);
    } catch (error) {
      throw error as Error;
    }
  }
}
