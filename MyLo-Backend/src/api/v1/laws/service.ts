import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import {
  CreateLawInterface,
  GetAllLaws,
  LawInterface,
  UpdateLawInterface,
  LawStatus,
  LawLanguage,
} from './laws';
import { Op } from 'sequelize';

export class LawService {
  data: LawInterface | CreateLawInterface | UpdateLawInterface;
  dataId: string;
  res: Response;
  filters?: {
    domainId?: string;
    originId?: string;
    status?: LawStatus;
    language?: LawLanguage;
  };

  constructor(
    data: LawInterface | CreateLawInterface | UpdateLawInterface,
    dataId: string,
    res: Response,
    filters?: {
      domainId?: string;
      originId?: string;
      status?: LawStatus;
      language?: LawLanguage;
    },
  ) {
    this.data = data;
    this.dataId = dataId;
    this.res = res;
    this.filters = filters;
  }

  private async lawExists(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const law = await Database.Law.findOne({ where: { id: this.dataId }, raw: true });
      if (!law) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async lawNumberExists(
    lawNumber: string,
    excludeId?: string,
  ): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const whereCondition: { 
        lawNumber: string; 
        id?: { [Op.ne]?: string }; 
      } = { lawNumber };
      if (excludeId) {
        whereCondition.id = { [Op.ne]: excludeId };
      }

      const law = await Database.Law.findOne({ where: whereCondition, raw: true });
      if (law) {
        return { exists: true };
      } else {
        return { exists: false };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async validateOriginExists(
    originId: string,
  ): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const origin = await Database.Origin.findOne({ where: { id: originId }, raw: true });
      if (!origin) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
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
      const {
        lawNumber,
        title,
        description,
        publishedAt,
        originId,
        domainId,
        status,
        language,
        tags,
      } = this.data as CreateLawInterface;

      // Check if law number already exists
      const lawNumberCheck = await this.lawNumberExists(lawNumber);
      if (lawNumberCheck.error) {
        const { message, stack } = lawNumberCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (lawNumberCheck.exists) {
        return ResponseService({
          data: null,
          status: 409,
          success: false,
          message: 'Law number already exists',
          res: this.res,
        });
      }

      // Validate origin exists
      const originCheck = await this.validateOriginExists(originId);
      if (originCheck.error) {
        const { message, stack } = originCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!originCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Origin not found',
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

      const law = await Database.Law.create({
        lawNumber,
        title,
        description,
        publishedAt: new Date(publishedAt),
        originId,
        domainId,
        status: status || 'Active',
        language: language || 'EN',
        tags: tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ResponseService({
        data: law,
        status: 201,
        success: true,
        message: 'Law successfully created',
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
      // Build where clause based on filters
      const whereClause: {
        domainId?: string;
        originId?: string;
        status?: LawStatus;
        language?: LawLanguage;
      } = {};

      if (this.filters?.domainId) {
        whereClause.domainId = this.filters.domainId;
      }

      if (this.filters?.originId) {
        whereClause.originId = this.filters.originId;
      }

      if (this.filters?.status) {
        whereClause.status = this.filters.status;
      }

      if (this.filters?.language) {
        whereClause.language = this.filters.language;
      }

      const laws = await Database.Law.findAll({
        where: whereClause,
        include: [
          {
            model: Database.Origin,
            as: 'origin',
            attributes: ['id', 'name', 'description'],
          },
          {
            model: Database.Domain,
            as: 'domain',
            attributes: ['id', 'name', 'description'],
          },
        ],
        order: [['publishedAt', 'DESC']],
      });

      if (!laws || laws.length === 0) {
        return ResponseService<GetAllLaws[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No laws found',
          res: this.res,
        });
      }

      return ResponseService({
        data: laws,
        status: 200,
        message: 'Laws successfully retrieved',
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
      const lawCheck = await this.lawExists();

      if (lawCheck.error) {
        const { message, stack } = lawCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!lawCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Law not found',
          res: this.res,
        });
      }

      const law = await Database.Law.findOne({
        where: { id: this.dataId },
        include: [
          {
            model: Database.Origin,
            as: 'origin',
            attributes: ['id', 'name', 'description'],
          },
          {
            model: Database.Domain,
            as: 'domain',
            attributes: ['id', 'name', 'description'],
          },
        ],
      });

      return ResponseService({
        data: law,
        status: 200,
        message: 'Law successfully retrieved',
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
      const lawCheck = await this.lawExists();
      if (lawCheck.error) {
        const { message, stack } = lawCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }
      if (!lawCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Law not found',
          res: this.res,
        });
      }

      const updateData: UpdateLawInterface = { ...this.data };

      // Check if law number is being updated and if it conflicts
      if (updateData.lawNumber) {
        const lawNumberCheck = await this.lawNumberExists(updateData.lawNumber, this.dataId);
        if (lawNumberCheck.error) {
          const { message, stack } = lawNumberCheck.error as Error;
          return ResponseService({
            data: { message, stack },
            success: false,
            status: 500,
            res: this.res,
          });
        }

        if (lawNumberCheck.exists) {
          return ResponseService({
            data: null,
            status: 409,
            success: false,
            message: 'Law number already exists',
            res: this.res,
          });
        }
      }

      // Validate origin if being updated
      if (updateData.originId) {
        const originCheck = await this.validateOriginExists(updateData.originId);
        if (originCheck.error) {
          const { message, stack } = originCheck.error as Error;
          return ResponseService({
            data: { message, stack },
            success: false,
            status: 500,
            res: this.res,
          });
        }

        if (!originCheck.exists) {
          return ResponseService({
            data: null,
            status: 404,
            success: false,
            message: 'Origin not found',
            res: this.res,
          });
        }
      }

      // Validate domain if being updated
      if (updateData.domainId) {
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
      }

      // Convert publishedAt to Date if provided
      if (updateData.publishedAt) {
        updateData.publishedAt = new Date(updateData.publishedAt);
      }

      const updatedLaw = await Database.Law.update(
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { where: { id: this.dataId } },
      );

      return ResponseService({
        data: updatedLaw,
        success: true,
        status: 200,
        message: 'Law successfully updated',
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
      const lawCheck = await this.lawExists();

      if (lawCheck.error) {
        const { message, stack } = lawCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (!lawCheck.exists) {
        return ResponseService({
          data: null,
          status: 404,
          success: false,
          message: 'Law not found',
          res: this.res,
        });
      }

      const deletedLaw = await Database.Law.destroy({ where: { id: this.dataId } });

      return ResponseService({
        data: deletedLaw,
        success: true,
        status: 200,
        message: 'Law successfully deleted',
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
