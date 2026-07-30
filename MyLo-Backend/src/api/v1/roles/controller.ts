import { Response } from 'express';
import { RoleService } from './service';
import { RoleRequestInterface, UpdateRoleRequestInterface } from './role';

export class RoleController {
  public async createRole(req: RoleRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleService = new RoleService(req.body, id, res);
      roleService.createRole();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllRoles(req: RoleRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleService = new RoleService(req.body, id, res);
      roleService.getAllRoles();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getASingleRole(req: RoleRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleService = new RoleService(req.body, id, res);
      roleService.getASingleRole();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateRole(req: UpdateRoleRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleService = new RoleService(req.body, id, res);
      roleService.updateRole();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteRole(req: RoleRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const roleService = new RoleService(req.body, id, res);
      roleService.deleteRole();
    } catch (error) {
      throw error as Error;
    }
  }
}
