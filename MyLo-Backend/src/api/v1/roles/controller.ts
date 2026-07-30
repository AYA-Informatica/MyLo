import { Request, Response } from 'express';
import { RoleService } from './service';

export class RoleController {
  public async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleService = new RoleService(req.body, id, res);
      roleService.createRole();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllRoles(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleService = new RoleService(req.body, id, res);
      roleService.getAllRoles();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getASingleRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleService = new RoleService(req.body, id, res);
      roleService.getASingleRole();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleService = new RoleService(req.body, id, res);
      roleService.updateRole();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleService = new RoleService(req.body, id, res);
      roleService.deleteRole();
    } catch (error) {
      throw error as Error;
    }
  }
}
