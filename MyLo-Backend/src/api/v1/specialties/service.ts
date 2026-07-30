import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import {
  CreateSpecialtyInterface,
  GetAllSpecialties,
  SpecialtyInterface,
  UpdateSpecialtyInterface,
} from './specialties';
import { Op } from 'sequelize';

export class SpecialtyService {
  data: SpecialtyInterface | CreateSpecialtyInterface | UpdateSpecialtyInterface;
  userId: string;
  dataId: string;
  res: Response;

  constructor(
    data: SpecialtyInterface | CreateSpecialtyInterface | UpdateSpecialtyInterface,
    userId: string,
    dataId: string,
    res: Response,
  ) {
    this.data = data;
    this.userId = userId;
    this.dataId = dataId;
    this.res = res;
  }

  private async specialtyExists(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const specialty = await Database.Specialty.findOne({ where: { id: this.dataId }, raw: true });
      if (!specialty) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async specialtyRelationExists(
    firmId: string, 
    domainId: string, 
    excludeId?: string,
  ): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const whereCondition: { 
        firmId: string; 
        domainId: string; 
        id?: { [Op.ne]?: string } 
      } = { firmId, domainId };
      
      if (excludeId) {
        whereCondition.id = { [Op.ne]: excludeId };
      }

      const specialty = await Database.Specialty.findOne({ where: whereCondition, raw: true });
      if (specialty) {
        return { exists: true };
      } else {
        return { exists: false };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async validateFirmExists(firmId: string): Promise<{ exists: boolean; isLawFirm: boolean; error?: unknown }> {
    try {
      const firm = await Database.User.findOne({
        where: { id: firmId },
        include: [
          {
            model: Database.Role,
            as: 'role',
            attributes: ['id', 'name'],
          },
        ],
        raw:true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;
      
      if (!firm) {
        return { exists: false, isLawFirm: false };
      }

      if (firm['role.name'] !== 'law-firm') {
        return { exists: true, isLawFirm: false };
      }

      return { exists: true, isLawFirm: true };
    } catch (error) {
      return { exists: false, isLawFirm: false, error };
    }
  }

  private async validateDomainExists(domainId: string): Promise<{ exists: boolean; error?: unknown }> {
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
      const { domainId } = this.data as CreateSpecialtyInterface;
      
      // Validate firm exists and is a law firm
      const firmCheck = await this.validateFirmExists(this.userId);
      if (firmCheck.error) {
        const { message, stack } = firmCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!firmCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Law firm not found',
          res: this.res,
        });
      }

      if (!firmCheck.isLawFirm) {
        return ResponseService({
          data: null,
          status: 400,
          success: false,
          message: 'User must be a law firm to have specialties',
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

      // Check if specialty relation already exists
      const relationCheck = await this.specialtyRelationExists(this.userId, domainId);
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
          message: 'This law firm already has this domain as a specialty',
          res: this.res,
        });
      }
      const specialty = await Database.Specialty.create({
        firmId:this.userId,
        domainId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ResponseService({
        data: specialty,
        status: 201,
        success: true,
        message: 'Specialty successfully created',
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
      const specialties = await Database.Specialty.findAll({
        include: [
          {
            model: Database.User,
            as: 'firm',
            attributes: ['id', 'name'],
            include:[
              {
                model: Database.Role,
                as: 'role',
                attributes: ['name'],
              },
            ],
          },
          {
            model: Database.Domain,
            as: 'domain',
            attributes: ['id', 'name'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      if (!specialties || specialties.length === 0) {
        return ResponseService<GetAllSpecialties[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No specialties found',
          res: this.res,
        });
      }

      return ResponseService({
        data: specialties,
        status: 200,
        message: 'Specialties successfully retrieved',
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
      const specialtyCheck = await this.specialtyExists();

      if (specialtyCheck.error) {
        const { message, stack } = specialtyCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!specialtyCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Specialty not found',
          res: this.res,
        });
      }

      const specialty = await Database.Specialty.findOne({
        where: { id: this.dataId },
        include: [
          {
            model: Database.User,
            as: 'firm',
            attributes: ['id', 'name'],
            include:[
              {
                model: Database.Role,
                as: 'role',
                attributes: ['name'],
              },
            ],
          },
          {
            model: Database.Domain,
            as: 'domain',
            attributes: ['id', 'name'],
          },
        ],
      });

      return ResponseService({
        data: specialty,
        status: 200,
        message: 'Specialty successfully retrieved',
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
      const specialtyCheck = await this.specialtyExists();
      if (specialtyCheck.error) {
        const { message, stack } = specialtyCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }
      if (!specialtyCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Specialty not found',
          res: this.res,
        });
      }

      const updateData: UpdateSpecialtyInterface = { 
        ...this.data,
        firmId: this.userId, 
      };

      // If both firmId and domainId are being updated, check for duplicate relation
      if (updateData.firmId && updateData.domainId) {
        // Validate firm exists and is a law firm
        const firmCheck = await this.validateFirmExists(updateData.firmId);
        if (firmCheck.error) {
          const { message, stack } = firmCheck.error as Error;
          return ResponseService({
            data: { message, stack },
            success: false,
            status: 500,
            res: this.res,
          });
        }

        if (!firmCheck.exists) {
          return ResponseService({
            data: null,
            status: 404,
            success: false,
            message: 'Law firm not found',
            res: this.res,
          });
        }

        if (!firmCheck.isLawFirm) {
          return ResponseService({
            data: null,
            status: 400,
            success: false,
            message: 'User must be a law firm to have specialties',
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
        const relationCheck = await this.specialtyRelationExists(
          updateData.firmId, 
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
            message: 'This law firm already has this domain as a specialty',
            res: this.res,
          });
        }
      }

      const updatedSpecialty = await Database.Specialty.update(
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { where: { id: this.dataId } },
      );

      return ResponseService({
        data: updatedSpecialty,
        success: true,
        status: 200,
        message: 'Specialty successfully updated',
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
      const specialtyCheck = await this.specialtyExists();

      if (specialtyCheck.error) {
        const { message, stack } = specialtyCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!specialtyCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Specialty not found',
          res: this.res,
        });
      }

      const deletedSpecialty = await Database.Specialty.destroy({ where: { id: this.dataId } });

      return ResponseService({
        data: deletedSpecialty,
        success: true,
        status: 200,
        message: 'Specialty successfully deleted',
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