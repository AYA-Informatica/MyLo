import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import { GetAllUsers, UpdateUserInterface, UserInterface } from './users';

export class UserService {
  data: UpdateUserInterface;
  userId: string;
  dataId: string;
  res: Response;

  constructor(data: UpdateUserInterface, userId: string, dataId: string, res: Response) {
    this.data = data;
    this.userId = userId;
    this.dataId = dataId;
    this.res = res;
  }

  private async userExist(): Promise<{ exists: boolean; user?: UserInterface; error?: unknown }> {
    try {
      const user = await Database.User.findOne({ where: { id: this.dataId }, raw: true });
      if (!user) {
        return { exists: false };
      } else {
        return { exists: true, user };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  async findAll(): Promise<unknown> {
    try {
      const users = await Database.User.findAll({
        include: [
          {
            model: Database.Role,
            as: 'role',
            attributes: ['id', 'name'],
          },
        ],
        attributes: { exclude: ['password'] },
      });

      if (!users || users.length === 0) {
        return ResponseService<GetAllUsers[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No users found',
          res: this.res,
        });
      }

      return ResponseService({
        data: users,
        status: 200,
        message: 'Users successfully retrieved',
        success: true,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async findCitizens(): Promise<unknown> {
    try {
      const citizenRole = await Database.Role.findOne({ where: { name: 'citizen' }, raw: true });
      if (!citizenRole) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Citizen role not found',
          res: this.res,
        });
      }

      const citizens = await Database.User.findAll({
        where: { roleId: citizenRole.id },
        include: [
          {
            model: Database.Role,
            as: 'role',
            attributes: ['id', 'name'],
          },
        ],
        attributes: { exclude: ['password'] },
      });

      if (!citizens || citizens.length === 0) {
        return ResponseService<GetAllUsers[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No citizens found',
          res: this.res,
        });
      }

      return ResponseService({
        data: citizens,
        status: 200,
        message: 'Citizens successfully retrieved',
        success: true,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async findOrganizations(): Promise<unknown> {
    try {
      const organizationRole = await Database.Role.findOne({
        where: { name: 'organization' },
        raw: true,
      });
      if (!organizationRole) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Organization role not found',
          res: this.res,
        });
      }

      const organizations = await Database.User.findAll({
        where: { roleId: organizationRole.id },
        include: [
          {
            model: Database.Role,
            as: 'role',
            attributes: ['id', 'name'],
          },
        ],
        attributes: { exclude: ['password'] },
      });

      if (!organizations || organizations.length === 0) {
        return ResponseService<GetAllUsers[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No organizations found',
          res: this.res,
        });
      }

      return ResponseService({
        data: organizations,
        status: 200,
        message: 'Organizations successfully retrieved',
        success: true,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async findLawFirms(): Promise<unknown> {
    try {
      const lawFirmRole = await Database.Role.findOne({ where: { name: 'law-firm' }, raw: true });
      if (!lawFirmRole) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Law firm role not found',
          res: this.res,
        });
      }

      const lawFirms = await Database.User.findAll({
        where: { roleId: lawFirmRole.id },
        include: [
          {
            model: Database.Role,
            as: 'role',
            attributes: ['id', 'name'],
          },
        ],
        attributes: { exclude: ['password'] },
      });

      if (!lawFirms || lawFirms.length === 0) {
        return ResponseService<GetAllUsers[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No law firms found',
          res: this.res,
        });
      }

      return ResponseService({
        data: lawFirms,
        status: 200,
        message: 'Law firms successfully retrieved',
        success: true,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async findOne(): Promise<unknown> {
    try {
      const userCheck = await this.userExist();

      if (userCheck.error) {
        const { message, stack } = userCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!userCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'User not found',
          res: this.res,
        });
      }

      const user = await Database.User.findOne({
        where: { id: this.dataId },
        include: [
          {
            model: Database.Role,
            as: 'role',
            attributes: ['id', 'name'],
          },
        ],
        attributes: { exclude: ['password'] },
      });

      return ResponseService({
        data: user,
        status: 200,
        message: 'User successfully retrieved',
        success: true,
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async update(): Promise<unknown> {
    try {
      const userCheck = await this.userExist();
      if (userCheck.error) {
        const { message, stack } = userCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }
      if (!userCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'User not found',
          res: this.res,
        });
      }

      const updateData: UpdateUserInterface = { ...this.data };

      const updatedUser = await Database.User.update(
        {
          ...updateData,
          roleId: userCheck.user?.roleId,
          isActive: userCheck.user?.isActive,
          googleId: userCheck.user?.googleId,
          provider: userCheck.user?.provider,
          updatedAt: new Date(),
        },
        { where: { id: this.dataId } },
      );

      return ResponseService({
        data: updatedUser,
        success: true,
        status: 200,
        message: 'User successfully updated',
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }

  async delete(): Promise<unknown> {
    try {
      const userCheck = await this.userExist();

      if (userCheck.error) {
        const { message, stack } = userCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!userCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'User not found',
          res: this.res,
        });
      }

      const deletedUser = await Database.User.destroy({ where: { id: this.dataId } });

      return ResponseService({
        data: deletedUser,
        success: true,
        status: 200,
        message: 'User successfully deleted',
        res: this.res,
      });
    } catch (error) {
      const { message, stack } = error as Error;
      return ResponseService({
        data: { message, stack },
        success: false,
        status: 500,
        res: this.res,
      });
    }
  }
}
