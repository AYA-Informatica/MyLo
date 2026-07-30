import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import {
  CreateDomainPreferenceInterface,
  GetAllDomainPreferences,
  DomainPreferenceInterface,
  UpdateDomainPreferenceInterface,
} from './DomainPreferences';
import { Op } from 'sequelize';

export class DomainPreferenceService {
  data:
    | DomainPreferenceInterface
    | CreateDomainPreferenceInterface
    | UpdateDomainPreferenceInterface;
  dataId: string;
  userId: string;
  res: Response;

  constructor(
    data:
      | DomainPreferenceInterface
      | CreateDomainPreferenceInterface
      | UpdateDomainPreferenceInterface,
    dataId: string,
    userId: string,
    res: Response,
  ) {
    this.data = data;
    this.dataId = dataId;
    this.userId = userId;
    this.res = res;
  }

  private async preferenceExists(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const preference = await Database.DomainPreference.findOne({
        where: { id: this.dataId },
        raw: true,
      });
      if (!preference) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async preferenceRelationExists(
    userId: string,
    domainId: string,
    excludeId?: string,
  ): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const whereCondition: {
        userId: string;
        domainId: string;
        id?: { [Op.ne]?: string };
      } = { userId, domainId };

      if (excludeId) {
        whereCondition.id = { [Op.ne]: excludeId };
      }

      const preference = await Database.DomainPreference.findOne({
        where: whereCondition,
        raw: true,
      });
      if (preference) {
        return { exists: true };
      } else {
        return { exists: false };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async validateProfileExists(
    userId: string,
  ): Promise<{ exists: boolean; isValidRole: boolean; role?: string; error?: unknown }> {
    try {
      const user = await Database.User.findOne({
        where: { id: userId },
        include:[{
          model: Database.Role,
          as:'role',
          attributes:['name'],
        }],
        raw: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;

      if (!user) {
        return { exists: false, isValidRole: false };
      }
      // console.log(user.role.name);
      const validRoles = ['citizen', 'organization'];
      if (!validRoles.includes(user['role.name'])) {
        return { exists: true, isValidRole: false, role: user['role.name'] };
      }

      return { exists: true, isValidRole: true, role: user.role };
    } catch (error) {
      return { exists: false, isValidRole: false, error };
    }
  }

  private async validateDomainExists(
    domainId: string,
  ): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const domain = await Database.Domain.findOne({ where: { id: domainId }, raw: true });
      if (!domain) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  async create(): Promise<unknown> {
    try {
      const { domainId } = this.data as CreateDomainPreferenceInterface;

      // Validate profile exists and has valid role (Citizen or Organization)
      const profileCheck = await this.validateProfileExists(this.userId);
      if (profileCheck.error) {
        const { message, stack } = profileCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!profileCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Profile not found',
          res: this.res,
        });
      }

      if (!profileCheck.isValidRole) {
        return ResponseService({
          data: null,
          status: 403,
          success: false,
          message: 'Only Citizens and Organizations can create domain preferences. Law firms should use the Specialty module instead.',
          res: this.res,
        });
      }

      // Validate domain exists
      const domainCheck = await this.validateDomainExists(domainId);
      if (domainCheck.error) {
        const { message, stack } = domainCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!domainCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Domain not found',
          res: this.res,
        });
      }

      // Check if preference relation already exists
      const relationCheck = await this.preferenceRelationExists(this.userId, domainId);
      if (relationCheck.error) {
        const { message, stack } = relationCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (relationCheck.exists) {
        return ResponseService({
          data: null,
          status: 409,
          success: false,
          message: 'This profile already has this domain as a preference',
          res: this.res,
        });
      }

      const preference = await Database.DomainPreference.create({
        userId:this.userId,
        domainId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ResponseService({
        data: preference,
        status: 201,
        success: true,
        message: 'Domain preference successfully created',
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

  async findAll(): Promise<unknown> {
    try {
      const preferences = await Database.DomainPreference.findAll({
        include: [
          {
            model: Database.User,
            as: 'user',
            attributes: ['id', 'name', 'username'],
            include:[
              {
                model: Database.Role,
                as: 'role',
                attributes:['name'],
              },
            ],
          },
          {
            model: Database.Domain,
            as: 'domain',
            attributes: ['name'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      if (!preferences || preferences.length === 0) {
        return ResponseService<GetAllDomainPreferences[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No domain preferences found',
          res: this.res,
        });
      }

      return ResponseService({
        data: preferences,
        status: 200,
        message: 'Domain preferences successfully retrieved',
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
      const preferenceCheck = await this.preferenceExists();

      if (preferenceCheck.error) {
        const { message, stack } = preferenceCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!preferenceCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Domain preference not found',
          res: this.res,
        });
      }

      const preference = await Database.DomainPreference.findOne({
        where: { id: this.dataId },
        include: [
           {
            model: Database.User,
            as: 'user',
            attributes: ['id', 'name', 'username'],
            include:[
              {
                model: Database.Role,
                as: 'role',
                attributes:['name'],
              },
            ],
          },
          {
            model: Database.Domain,
            as: 'domain',
            attributes: ['name'],
          },
        ],
      });

      return ResponseService({
        data: preference,
        status: 200,
        message: 'Domain preference successfully retrieved',
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
      const preferenceCheck = await this.preferenceExists();
      if (preferenceCheck.error) {
        const { message, stack } = preferenceCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }
      if (!preferenceCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Domain preference not found',
          res: this.res,
        });
      }

      const updateData: UpdateDomainPreferenceInterface = { ...this.data };

      // If both profileId and domainId are being updated, validate
      if (updateData.userId && updateData.domainId) {
        // Validate profile exists and has valid role
        const profileCheck = await this.validateProfileExists(updateData.userId);
        if (profileCheck.error) {
          const { message, stack } = profileCheck.error as Error;
          return ResponseService({
            data: { message, stack },
            success: false,
            status: 500,
            res: this.res,
          });
        }

        if (!profileCheck.exists) {
          return ResponseService({
            data: null,
            status: 404,
            success: false,
            message: 'Profile not found',
            res: this.res,
          });
        }

        if (!profileCheck.isValidRole) {
          return ResponseService({
            data: null,
            status: 403,
            success: false,
            message: 'Only Citizens and Organizations can have domain preferences. Law firms should use the Specialty module instead.',
            res: this.res,
          });
        }

        // Validate domain exists
        const domainCheck = await this.validateDomainExists(updateData.domainId);
        if (domainCheck.error) {
          const { message, stack } = domainCheck.error as Error;
          return ResponseService({
            data: { message, stack },
            success: false,
            status: 500,
            res: this.res,
          });
        }

        if (!domainCheck.exists) {
          return ResponseService({
            data: null,
            status: 404,
            success: false,
            message: 'Domain not found',
            res: this.res,
          });
        }

        // Check if the new relation already exists
        const relationCheck = await this.preferenceRelationExists(
          updateData.userId,
          updateData.domainId,
          this.dataId,
        );
        if (relationCheck.error) {
          const { message, stack } = relationCheck.error as Error;
          return ResponseService({
            data: { message, stack },
            success: false,
            status: 500,
            res: this.res,
          });
        }

        if (relationCheck.exists) {
          return ResponseService({
            data: null,
            status: 409,
            success: false,
            message: 'This profile already has this domain as a preference',
            res: this.res,
          });
        }
      }

      const updatedPreference = await Database.DomainPreference.update(
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { where: { id: this.dataId } },
      );

      return ResponseService({
        data: updatedPreference,
        success: true,
        status: 200,
        message: 'Domain preference successfully updated',
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
      const preferenceCheck = await this.preferenceExists();

      if (preferenceCheck.error) {
        const { message, stack } = preferenceCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!preferenceCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Domain preference not found',
          res: this.res,
        });
      }

      const deletedPreference = await Database.DomainPreference.destroy({
        where: { id: this.dataId },
      });

      return ResponseService({
        data: deletedPreference,
        success: true,
        status: 200,
        message: 'Domain preference successfully deleted',
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
