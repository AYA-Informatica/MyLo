import { Response } from 'express';
import { SpecialtyService } from './service';
import { SpecialtyRequestInterface, UpdateSpecialtyRequestInterface } from './specialties';

export class SpecialtyController {
  public async createSpecialty(req: SpecialtyRequestInterface, res: Response): Promise<void> {
    try {
      const user = req.user?.id;
      const specialtyService = new SpecialtyService(req.body, user as string, '' , res);
      specialtyService.create();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getAllSpecialties(req: SpecialtyRequestInterface, res: Response): Promise<void> {
    try {
      const user = req.user?.id;
      const specialtyService = new SpecialtyService(req.body,user as string, '', res);
      specialtyService.findAll();
    } catch (error) {
      throw error as Error;
    }
  }

  public async getSpecialty(req: SpecialtyRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user?.id;
      const specialtyService = new SpecialtyService(req.body, user as string, id, res);
      specialtyService.findOne();
    } catch (error) {
      throw error as Error;
    }
  }

  public async updateSpecialty(req: UpdateSpecialtyRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user?.id;
      const specialtyService = new SpecialtyService(req.body,user as string, id, res);
      specialtyService.update();
    } catch (error) {
      throw error as Error;
    }
  }

  public async deleteSpecialty(req: SpecialtyRequestInterface, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user?.id;
      const specialtyService = new SpecialtyService(req.body, user as string, id, res);
      specialtyService.delete();
    } catch (error) {
      throw error as Error;
    }
  }
}