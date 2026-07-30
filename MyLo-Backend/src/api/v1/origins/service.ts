import { Response } from 'express';
import { Database } from '../../../database';
import { ResponseService } from '../../../utils/response';
import {
  CreateOriginInterface,
  GetAllOrigins,
  OriginInterface,
  UpdateOriginInterface,
} from './origins';

export class OriginService {
  data: OriginInterface | CreateOriginInterface | UpdateOriginInterface;
  dataId: string;
  res: Response;

  constructor(
    data: OriginInterface | CreateOriginInterface | UpdateOriginInterface,
    dataId: string,
    res: Response,
  ) {
    this.data = data;
    this.dataId = dataId;
    this.res = res;
  }

  private async originExists(): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const origin = await Database.Origin.findOne({ where: { id: this.dataId }, raw: true });
      if (!origin) {
        return { exists: false };
      } else {
        return { exists: true };
      }
    } catch (error) {
      return { exists: false, error };
    }
  }

  private async originNameExists( name: string): Promise<{ exists: boolean; error?: unknown }> {
    try {
      const origin = await Database.Origin.findOne({ where: {name: name as string}, raw: true });
      if (origin) {
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
      const { name, description } = this.data as CreateOriginInterface;

      // Check if origin name already exists
      const nameCheck = await this.originNameExists(name);
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
          message: 'Origin name already exists',
          res: this.res,
        });
      }

      const origin = await Database.Origin.create({
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return ResponseService({
        data: origin,
        status: 201,
        success: true,
        message: 'Origin successfully created',
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
      const origins = await Database.Origin.findAll({
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'name', 'description', 'createdAt', 'updatedAt'],
      });

      if (!origins || origins.length === 0) {
        return ResponseService<GetAllOrigins[]>({
          data: [],
          status: 200,
          success: true,
          message: 'No origins found',
          res: this.res,
        });
      }

      return ResponseService({
        data: origins,
        status: 200,
        message: 'Origins successfully retrieved',
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
      const originCheck = await this.originExists();

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

      const origin = await Database.Origin.findOne({
        where: { id: this.dataId },
        attributes: ['id', 'name', 'description', 'createdAt', 'updatedAt'],
      });

      return ResponseService({
        data: origin,
        status: 200,
        message: 'Origin successfully retrieved',
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
      const originCheck = await this.originExists();
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

      const updateData: UpdateOriginInterface = { ...this.data };

      // Check if name is being updated and if it conflicts with existing origins
      if (updateData.name) {
        const nameCheck = await this.originNameExists(updateData.name);
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
            message: 'Origin name already exists',
            res: this.res,
          });
        }
      }

      const updatedOrigin = await Database.Origin.update(
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { where: { id: this.dataId } },
      );

      return ResponseService({
        data: updatedOrigin,
        success: true,
        status: 200,
        message: 'Origin successfully updated',
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
      const originCheck = await this.originExists();

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

      const deletedOrigin = await Database.Origin.destroy({ where: { id: this.dataId } });

      return ResponseService({
        data: deletedOrigin,
        success: true,
        status: 200,
        message: 'Origin successfully deleted',
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
