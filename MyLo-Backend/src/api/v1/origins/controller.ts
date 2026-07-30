import { Response } from 'express';
import { OriginService } from './service';
import { OriginRequestInterface, UpdateOriginRequestInterface } from './origins';

export class OriginController {
  public async createOrigin(req: OriginRequestInterface, res: Response): Promise<void> {
    try {
      const originService = new OriginService(req.body, '', res);
      originService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllOrigins(req: OriginRequestInterface, res: Response): Promise<void> {
    try {
      const originService = new OriginService(req.body, '', res);
      originService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getOrigin(req: OriginRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const originService = new OriginService(req.body, id, res);
      originService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateOrigin(req: UpdateOriginRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const originService = new OriginService(req.body, id, res);
      originService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteOrigin(req: OriginRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const originService = new OriginService(req.body, id, res);
      originService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}
