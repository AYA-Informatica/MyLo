import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import {
  CreateDomainInterface,
  GetAllDomains,
  DomainInterface,
  UpdateDomainInterface,
} from './domains';

export class DomainService {
  data: DomainInterface | CreateDomainInterface | UpdateDomainInterface;
  dataId: string;
  res: Response;

  constructor(
    data: DomainInterface | CreateDomainInterface | UpdateDomainInterface,
    dataId: string,
    res: Response,
  ) {
    this.data = data;
    this.dataId = dataId;
    this.res = res;
  }

  private async domainExists(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const domain = await Database.Domain.findOne({ where: { id: this.dataId }, raw: true });
      if (!domain) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async domainNameExists(name: string): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const domain = await Database.Domain.findOne({ where: { name: name as string }, raw: true });
      if (domain) {
        return { exists: true };
      } else {
        return { exists: false };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  async create(): Promise<unknown> {
    try {
      const { name, description } = this.data as CreateDomainInterface;

      // Check if domain name already exists
      const nameCheck = await this.domainNameExists(name);
      if (nameCheck.error) {
        const { message, stack } = nameCheck.error as Error;
        return ResponseService({
          data: { message, stack },
          success: false,
          status: 500,
          res: this.res,
        });
      }

      if (nameCheck.exists) {
        return ResponseService({
          data: null,
          status: 409,
          success: false,
          message: 'Domain name already exists',
          res: this.res,
        });
      }

      const domain = await Database.Domain.create({
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ResponseService({
        data: domain,
        status: 201,
        success: true,
        message: 'Domain successfully created',
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
      const domains = await Database.Domain.findAll({
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'name', 'description', 'createdAt', 'updatedAt'],
      });

      if (!domains || domains.length === 0) {
        return ResponseService<GetAllDomains[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No domains found',
          res: this.res,
        });
      }

      return ResponseService({
        data: domains,
        status: 200,
        message: 'Domains successfully retrieved',
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
      const domainCheck = await this.domainExists();

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

      const domain = await Database.Domain.findOne({
        where: { id: this.dataId },
        attributes: ['id', 'name', 'description', 'createdAt', 'updatedAt'],
      });

      return ResponseService({
        data: domain,
        status: 200,
        message: 'Domain successfully retrieved',
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
      const domainCheck = await this.domainExists();
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
      const updateData: UpdateDomainInterface = { ...this.data };

      // Check if name is being updated and if it conflicts with existing domains
      if (updateData.name) {
        const nameCheck = await this.domainNameExists(updateData.name);
        if (nameCheck.error) {
          const { message, stack } = nameCheck.error as Error;
          return ResponseService({
            data: { message, stack },
            success: false,
            status: 500,
            res: this.res,
          });
        }

        if (nameCheck.exists) {
          return ResponseService({
            data: null,
            status: 409,
            success: false,
            message: 'Domain name already exists',
            res: this.res,
          });
        }
      }

      const updatedDomain = await Database.Domain.update(
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { where: { id: this.dataId } },
      );

      return ResponseService({
        data: updatedDomain,
        success: true,
        status: 200,
        message: 'Domain successfully updated',
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
      const domainCheck = await this.domainExists();

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

      const deletedDomain = await Database.Domain.destroy({ where: { id: this.dataId } });

      return ResponseService({
        data: deletedDomain,
        success: true,
        status: 200,
        message: 'Domain successfully deleted',
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
