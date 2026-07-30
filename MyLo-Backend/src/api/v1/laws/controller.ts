import { Response } from 'express';
import { LawService } from './service';
import { LawRequestInterface, UpdateLawRequestInterface } from './laws';

export class LawController {
  public async createLaw(req: LawRequestInterface, res: Response): Promise<void> {
    try {
      const lawService = new LawService(req.body, '', res);
      lawService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllLaws(req: LawRequestInterface, res: Response): Promise<void> {
    try {
      const filters = {
        domainId: req.query?.domainId,
        originId: req.query?.originId,
        status: req.query?.status,
        language: req.query?.language,
      };
      const lawService = new LawService(req.body, '', res, filters);
      lawService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getLaw(req: LawRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lawService = new LawService(req.body, id, res);
      lawService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateLaw(req: UpdateLawRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lawService = new LawService(req.body, id, res);
      lawService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteLaw(req: LawRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lawService = new LawService(req.body, id, res);
      lawService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}