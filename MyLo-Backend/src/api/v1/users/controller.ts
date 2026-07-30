import { Response } from 'express';
import { UserService } from './service';
import { UserRequestInterface, UpdateUserRequestInterface } from './users';

export class UserController {
  public async getAllUsers(req: UserRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const userService = new UserService(req.body, user, id, res);
      userService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllCitizens(req: UserRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const userService = new UserService(req.body, user, id, res);
      userService.findCitizens();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllOrganizations(req: UserRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const userService = new UserService(req.body, user, id, res);
      userService.findOrganizations();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllLawFirms(req: UserRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const userService = new UserService(req.body, user, id, res);
      userService.findLawFirms();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAUser(req: UserRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const userService = new UserService(req.body, user, id, res);
      userService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateUser(req: UpdateUserRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const userService = new UserService(req.body, user, id, res);
      userService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteUser(req: UserRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req?.user?.id as string;
      const userService = new UserService(req.body, user, id, res);
      userService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}
