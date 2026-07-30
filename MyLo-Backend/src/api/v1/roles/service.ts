import { Response } from 'express';
import { ResponseService } from '../../../utils/response';
import { Database } from '../../../database';

export class RoleService {
  data: RoleInterface | CreateRoleInterface | UpdateRoleInterface;
  id: string;
  res: Response;

  constructor(data: RoleInterface, id: string, res: Response) {
    this.data = data;
    this.id = id;
    this.res = res;
  }

  private async roleExist(): Promise<boolean> {
    try {
      const roleExist = await Database.Role.findByPk(this.id);
      if (!roleExist) {
        ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Role not found',
          res: this.res,
        });
        return false;
      } else {
        return true;
      }
    } catch (error) {
      const { message, stack } = error as Error;
      ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
      return false;
    }
  }

  async createRole(): Promise<void> {
    try {
      const { name, permissions } = this.data as CreateRoleInterface;
      const roleExitst = await Database.Role.findOne({ where: { name } });
      if (roleExitst) {
        ResponseService({
          data: null,
          status: 409,
          success: false,
          message: 'Role already exists',
          res: this.res,
        });
        return;
      }

      const role = await Database.Role.create({
        name,
        permissions,
      });

      ResponseService({
        data: role,
        message: 'Role created successfully',
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

  async getAllRoles(): Promise<unknown> {
    try {
      const roles = await Database.Role.findAll();
      if (!roles || roles.length === 0) {
        ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Default role "organization" not found',
          res: this.res,
        });
        return;
      }
      return ResponseService<GetAllRoles>({
        data: { roles },
        status: 200,
        success: true,
        message: 'Roles retrieved successfully',
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

  async getASingleRole(): Promise<void> {
    try {
      if ((await this.roleExist()) === true) {
        const role = await Database.Role.findOne({ where: { id: this.id } });
        ResponseService({
          data: role,
          status: 200,
          success: true,
          message: 'Role retrieved successfully',
          res: this.res,
        });
      }
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

  async updateRole(): Promise<void> {
    try {
      if ((await this.roleExist()) === true) {
        const updatedRole = await Database.Role.update(
          {
            ...(this.data as UpdateRoleInterface),
            updatedAt: new Date(),
          },
          { where: { id: this.id } },
        );

        ResponseService({
          data: updatedRole,
          success: true,
          status: 200,
          message: 'Role successfully updated',
          res: this.res,
        });
      }
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

  async deleteRole(): Promise<void> {
    try {
      if ((await this.roleExist()) === true) {
        const deletedRole = await Database.Role.destroy({ where: { id: this.id } });
        ResponseService({
          data: deletedRole,
          success: true,
          status: 200,
          message: 'Role successfully deleted',
          res: this.res,
        });
      }
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
}
